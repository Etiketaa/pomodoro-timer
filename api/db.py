"""
Database connection module for PostgreSQL (Neon/Vercel)
Provides a connection pool and helper functions for queries.
"""

import os
import json
import psycopg2
import psycopg2.extras
from contextlib import contextmanager
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL')

if not DATABASE_URL:
    raise ValueError(
        "DATABASE_URL not found. Set it in your .env or Vercel environment variables.\n"
        "For Neon: go to https://neon.tech and create a project, then copy the connection string."
    )


def get_connection():
    """Get a new database connection."""
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = False
    return conn


@contextmanager
def get_db():
    """Context manager for database connections with automatic commit/rollback."""
    conn = get_connection()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def query_one(sql, params=None, fetch=True):
    """Execute a query and return a single row as a dict."""
    with get_db() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(sql, params)
            if fetch:
                row = cur.fetchone()
                return dict(row) if row else None
            return None


def query_all(sql, params=None):
    """Execute a query and return all rows as a list of dicts."""
    with get_db() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(sql, params)
            rows = cur.fetchall()
            return [dict(row) for row in rows]


def execute(sql, params=None, returning=False):
    """Execute a query (INSERT/UPDATE/DELETE). Returns affected row count or last inserted id."""
    with get_db() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(sql, params)
            if returning:
                row = cur.fetchone()
                return dict(row) if row else None
            return cur.rowcount


def execute_many(sql, params_list):
    """Execute a query with multiple parameter sets."""
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.executemany(sql, params_list)
            return cur.rowcount


def init_db():
    """Initialize database tables from schema.sql."""
    schema_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'schema.sql')
    with open(schema_path, 'r') as f:
        schema = f.read()
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(schema)
        conn.commit()
    print("Database initialized successfully.")


# Helper: convert RealDictRow to JSON-safe dict
def row_to_dict(row):
    """Convert a database row to a JSON-serializable dict."""
    if row is None:
        return None
    result = dict(row)
    for key, value in result.items():
        if hasattr(value, 'isoformat'):
            result[key] = value.isoformat()
        elif isinstance(value, (dict, list)):
            result[key] = value
    return result


def rows_to_dict(rows):
    """Convert multiple rows to a list of JSON-serializable dicts."""
    return [row_to_dict(row) for row in rows]
