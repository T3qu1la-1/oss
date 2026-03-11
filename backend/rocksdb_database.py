"""
🪨 ROCKSDB DATABASE - Banco de dados embarcado de alta performance
Substituição permanente do MongoDB usando RocksDB via rocksdict.
Dados ficam em backend/data_rocks/ - persistente e rápido.
"""

import json
import os
import asyncio
from typing import Optional, Dict, List, Any
from datetime import datetime
import copy
import uuid
from rocksdict import Rdict

# Diretório onde os dados serão salvos
DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data_rocks")
os.makedirs(DATA_DIR, exist_ok=True)


class RocksCollection:
    """Simula uma coleção do MongoDB usando RocksDB"""

    def __init__(self, name: str):
        self.name = name
        self.db_path = os.path.join(DATA_DIR, name)
        self._lock = asyncio.Lock()
        self._db = Rdict(self.db_path)

    def _serialize(self, doc: Dict) -> str:
        return json.dumps(doc, default=str, ensure_ascii=False)

    def _deserialize(self, data: str) -> Dict:
        return json.loads(data)

    def _get_all_docs(self) -> List[Dict]:
        docs = []
        for key in self._db.keys():
            try:
                docs.append(self._deserialize(self._db[key]))
            except Exception:
                continue
        return docs

    def _matches(self, doc: Dict, filter_: Dict) -> bool:
        for key, value in filter_.items():
            if key == "$or":
                if not any(self._matches(doc, cond) for cond in value):
                    return False
            elif key == "$and":
                if not all(self._matches(doc, cond) for cond in value):
                    return False
            else:
                doc_val = doc.get(key)
                if isinstance(value, dict):
                    for op, op_val in value.items():
                        if op == "$ne" and doc_val == op_val:
                            return False
                        elif op == "$gt" and (doc_val is None or doc_val <= op_val):
                            return False
                        elif op == "$gte" and (doc_val is None or doc_val < op_val):
                            return False
                        elif op == "$lt" and (doc_val is None or doc_val >= op_val):
                            return False
                        elif op == "$lte" and (doc_val is None or doc_val > op_val):
                            return False
                        elif op == "$in" and doc_val not in op_val:
                            return False
                        elif op == "$regex":
                            import re
                            if not re.search(op_val, str(doc_val or ''), re.IGNORECASE):
                                return False
                else:
                    if doc_val != value:
                        return False
        return True

    def _apply_projection(self, doc: Dict, projection: Optional[Dict]) -> Dict:
        if not projection:
            result = copy.deepcopy(doc)
            result.pop('_id', None)
            return result

        result = copy.deepcopy(doc)
        has_inclusion = any(v == 1 for k, v in projection.items() if k != '_id')
        has_exclusion = any(v == 0 for k, v in projection.items() if k != '_id')

        if has_inclusion:
            new_result = {}
            for key, val in projection.items():
                if val == 1 and key in result:
                    new_result[key] = result[key]
            result = new_result
        elif has_exclusion:
            for key, val in projection.items():
                if val == 0 and key in result:
                    del result[key]

        result.pop('_id', None)
        return result

    def _doc_key(self, doc: Dict) -> str:
        return doc.get('id', doc.get('_id', str(uuid.uuid4())))

    async def find_one(self, filter_: Dict, projection: Optional[Dict] = None) -> Optional[Dict]:
        async with self._lock:
            for doc in self._get_all_docs():
                if self._matches(doc, filter_):
                    return self._apply_projection(doc, projection)
            return None

    def find(self, filter_: Dict = None, projection: Optional[Dict] = None):
        filter_ = filter_ or {}
        return RocksCursor(self, filter_, projection)

    async def insert_one(self, doc: Dict):
        async with self._lock:
            doc_copy = copy.deepcopy(doc)
            doc_copy.pop('_id', None)
            key = self._doc_key(doc_copy)
            if 'id' not in doc_copy:
                doc_copy['id'] = key
            self._db[key] = self._serialize(doc_copy)
        return InsertResult(True)

    async def update_one(self, filter_: Dict, update: Dict):
        async with self._lock:
            for doc in self._get_all_docs():
                if self._matches(doc, filter_):
                    if "$set" in update:
                        for k, v in update["$set"].items():
                            doc[k] = v
                    if "$push" in update:
                        for k, v in update["$push"].items():
                            if k not in doc:
                                doc[k] = []
                            doc[k].append(v)
                    if "$unset" in update:
                        for k in update["$unset"]:
                            doc.pop(k, None)
                    if "$inc" in update:
                        for k, v in update["$inc"].items():
                            doc[k] = doc.get(k, 0) + v
                    key = self._doc_key(doc)
                    self._db[key] = self._serialize(doc)
                    return UpdateResult(1)
            return UpdateResult(0)

    async def update_many(self, filter_: Dict, update: Dict):
        async with self._lock:
            count = 0
            for doc in self._get_all_docs():
                if self._matches(doc, filter_):
                    if "$set" in update:
                        for k, v in update["$set"].items():
                            doc[k] = v
                    if "$unset" in update:
                        for k in update["$unset"]:
                            doc.pop(k, None)
                    key = self._doc_key(doc)
                    self._db[key] = self._serialize(doc)
                    count += 1
            return UpdateResult(count)

    async def delete_one(self, filter_: Dict):
        async with self._lock:
            for doc in self._get_all_docs():
                if self._matches(doc, filter_):
                    key = self._doc_key(doc)
                    del self._db[key]
                    return DeleteResult(1)
            return DeleteResult(0)

    async def delete_many(self, filter_: Dict):
        async with self._lock:
            deleted = 0
            for doc in self._get_all_docs():
                if self._matches(doc, filter_):
                    key = self._doc_key(doc)
                    del self._db[key]
                    deleted += 1
            return DeleteResult(deleted)

    async def count_documents(self, filter_: Dict = None) -> int:
        filter_ = filter_ or {}
        async with self._lock:
            if not filter_:
                return len(list(self._db.keys()))
            return sum(1 for doc in self._get_all_docs() if self._matches(doc, filter_))

    async def drop(self):
        async with self._lock:
            for key in list(self._db.keys()):
                del self._db[key]


class RocksCursor:
    def __init__(self, collection: RocksCollection, filter_: Dict, projection: Optional[Dict] = None):
        self.collection = collection
        self.filter_ = filter_
        self.projection = projection
        self._sort_key = None
        self._sort_direction = 1
        self._skip = 0
        self._limit = 0

    def sort(self, key: str, direction: int = 1):
        self._sort_key = key
        self._sort_direction = direction
        return self

    def skip(self, skip_count: int):
        self._skip = skip_count
        return self

    def limit(self, limit_count: int):
        self._limit = limit_count
        return self

    async def to_list(self, length: int = 1000) -> List[Dict]:
        _len = self._limit if self._limit > 0 else length
        async with self.collection._lock:
            results = []
            for doc in self.collection._get_all_docs():
                if self.collection._matches(doc, self.filter_):
                    results.append(self.collection._apply_projection(doc, self.projection))

            if self._sort_key:
                results.sort(
                    key=lambda x: x.get(self._sort_key, ''),
                    reverse=(self._sort_direction == -1)
                )
            
            if self._skip > 0:
                results = results[self._skip:]

            return results[:_len]


class InsertResult:
    def __init__(self, acknowledged: bool):
        self.acknowledged = acknowledged


class UpdateResult:
    def __init__(self, modified_count: int):
        self.modified_count = modified_count
        self.matched_count = modified_count


class DeleteResult:
    def __init__(self, deleted_count: int):
        self.deleted_count = deleted_count


class RocksDatabase:
    def __init__(self, name: str):
        self.name = name
        self._collections = {}

    def __getattr__(self, name: str) -> RocksCollection:
        if name.startswith('_'):
            return super().__getattribute__(name)
        if name not in self._collections:
            self._collections[name] = RocksCollection(f"{self.name}_{name}")
        return self._collections[name]

    def __getitem__(self, name: str) -> RocksCollection:
        if name not in self._collections:
            self._collections[name] = RocksCollection(f"{self.name}_{name}")
        return self._collections[name]


class RocksClient:
    """Drop-in replacement for AsyncIOMotorClient"""

    def __init__(self, *args, **kwargs):
        self._databases = {}

    def __getitem__(self, name: str) -> RocksDatabase:
        if name not in self._databases:
            self._databases[name] = RocksDatabase(name)
        return self._databases[name]

    def close(self):
        pass
