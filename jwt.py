import secrets
jwt_secret = secrets.token_hex(32)
print(f"JWT Secret: {jwt_secret}")