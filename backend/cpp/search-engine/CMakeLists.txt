cmake_minimum_required(VERSION 3.14)
project(search-engine VERSION 1.0.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Otimizações agressivas para release
if(NOT CMAKE_BUILD_TYPE)
    set(CMAKE_BUILD_TYPE Release)
endif()

set(CMAKE_CXX_FLAGS_RELEASE "-O3 -DNDEBUG -march=native")

add_executable(search-engine
    src/main.cpp
    src/searcher.cpp
    src/entropy.cpp
)

target_include_directories(search-engine PRIVATE src)

# Threading
find_package(Threads REQUIRED)
target_link_libraries(search-engine PRIVATE Threads::Threads)

# Stripping em release
if(CMAKE_BUILD_TYPE STREQUAL "Release")
    if(UNIX)
        target_link_options(search-engine PRIVATE -s)
    endif()
endif()
