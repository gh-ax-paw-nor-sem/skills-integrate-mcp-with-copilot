"""
Data models for the application
"""
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from enum import Enum


class UserRole(str, Enum):
    """User roles in the system"""
    STUDENT = "student"
    TEACHER = "teacher"
    ADMIN = "admin"


class UserCreate(BaseModel):
    """Model for creating a new user"""
    email: EmailStr
    password: str
    full_name: str
    role: UserRole = UserRole.STUDENT


class UserLogin(BaseModel):
    """Model for user login"""
    email: EmailStr
    password: str


class User(BaseModel):
    """User model"""
    email: EmailStr
    full_name: str
    role: UserRole
    is_active: bool = True


class Token(BaseModel):
    """Token model"""
    access_token: str
    token_type: str


class TokenData(BaseModel):
    """Token data model"""
    email: Optional[str] = None
    role: Optional[str] = None
