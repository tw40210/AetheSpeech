"""Tests for /auth/register and /auth/login endpoints."""

import pytest


@pytest.mark.asyncio
async def test_register_success(client):
    resp = await client.post(
        "/auth/register",
        json={"email": "new@example.com", "password": "password123"},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_register_duplicate_email(client):
    payload = {"email": "dup@example.com", "password": "pass"}
    await client.post("/auth/register", json=payload)
    resp = await client.post("/auth/register", json=payload)
    assert resp.status_code == 400
    assert "already registered" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_register_invalid_email(client):
    resp = await client.post(
        "/auth/register",
        json={"email": "not-an-email", "password": "pass"},
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_login_success(client):
    await client.post(
        "/auth/register",
        json={"email": "login@example.com", "password": "mypassword"},
    )
    resp = await client.post(
        "/auth/login",
        json={"email": "login@example.com", "password": "mypassword"},
    )
    assert resp.status_code == 200
    assert "access_token" in resp.json()


@pytest.mark.asyncio
async def test_login_wrong_password(client):
    await client.post(
        "/auth/register",
        json={"email": "wrongpw@example.com", "password": "correct"},
    )
    resp = await client.post(
        "/auth/login",
        json={"email": "wrongpw@example.com", "password": "wrong"},
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_login_unknown_user(client):
    resp = await client.post(
        "/auth/login",
        json={"email": "ghost@example.com", "password": "anything"},
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_protected_route_without_token(client):
    resp = await client.get("/topics")
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_protected_route_with_invalid_token(client):
    resp = await client.get("/topics", headers={"Authorization": "Bearer bad-token"})
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_protected_route_with_valid_token(client, auth_headers):
    resp = await client.get("/topics", headers=auth_headers)
    assert resp.status_code == 200
