import os
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.domain.models import Base
from app.infrastructure.db.init_db import init_db

# Use in-memory SQLite for tests
TEST_DATABASE_URL = "sqlite:///:memory:"


@pytest.fixture(scope="function")
def test_db():
    engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
    
    # In SQLite, schema qualifications in tables (like core.tb_cementerio) need tables created directly
    # Strip schema for sqlite tests
    for table in Base.metadata.tables.values():
        table.schema = None

    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = TestingSessionLocal()

    # Seed initial data
    init_db(session)

    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)
