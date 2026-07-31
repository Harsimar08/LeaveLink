"""
Flask extensions initialization
This file prevents circular imports by initializing extensions separately
"""
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager

# Initialize extensions (without app)
db = SQLAlchemy()
jwt = JWTManager()
