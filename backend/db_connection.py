"""
🔌 DB CONNECTION - Singleton compartilhado de RocksDB
Todos os módulos importam daqui para evitar conflito de locks.
Usa lazy initialization para compatibilidade com uvicorn --reload.
"""
import os
from rocksdb_database import RocksClient

_DB_NAME = os.getenv('DB_NAME', 'olhos_de_deus')
_client_instance = None
_db_instance = None
_col_cache = {}


def get_client():
    global _client_instance
    if _client_instance is None:
        _client_instance = RocksClient(os.getenv('MONGO_URL', 'mongodb://localhost:27017'))
    return _client_instance


def get_db():
    global _db_instance
    if _db_instance is None:
        _db_instance = get_client()[_DB_NAME]
    return _db_instance


class _LazyCollection:
    """Proxy que só abre o RocksDB quando realmente acessado"""
    def __init__(self, name):
        self._name = name

    def _real(self):
        if self._name not in _col_cache:
            _col_cache[self._name] = get_db()[self._name]
        return _col_cache[self._name]

    def __getattr__(self, attr):
        if attr.startswith('_'):
            return super().__getattribute__(attr)
        return getattr(self._real(), attr)


class _LazyClient:
    def __getitem__(self, name):
        return get_client()[name]
    def __getattr__(self, name):
        return getattr(get_client(), name)


class _LazyDB:
    def __getitem__(self, name):
        return get_db()[name]
    def __getattr__(self, name):
        return getattr(get_db(), name)


# Exports — totalmente lazy, RocksDB só abre na PRIMEIRA query real
client = _LazyClient()
db = _LazyDB()
users_collection = _LazyCollection('users')
telegram_users_collection = _LazyCollection('telegram_users')
scans_collection = _LazyCollection('scans')
