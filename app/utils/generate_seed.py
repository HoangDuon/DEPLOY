from passlib.context import CryptContext
from datetime import datetime

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# 🔹 Mật khẩu chung cho toàn bộ user seed
plain_password = "123456"
hashed_pw = pwd_context.hash(plain_password)
now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

print("🔐 Generated bcrypt hash:", hashed_pw)
print("\n-- Copy from below into your MySQL seed file:\n")

# 🔹 Danh sách users theo role
roles = [
    ("manager", [
        ("Manager One", "manager1@lms.com"),
        ("Manager Two", "manager2@lms.com")
    ]),
    ("tc", [
        ("TC One", "tc1@lms.com"),
        ("TC Two", "tc2@lms.com")
    ]),
    ("cs", [
        ("CS One", "cs1@lms.com"),
        ("CS Two", "cs2@lms.com")
    ]),
    ("lec", [
        ("Lecturer One", "lec1@lms.com"),
        ("Lecturer Two", "lec2@lms.com")
    ]),
]

role_id = {
    "manager": 1,
    "tc": 2,
    "cs": 3,
    "lec": 4
}

for role_name, users in roles:
    print(f"-- {role_name.upper()} (role_id = {role_id[role_name]})")
    for name, email in users:
        sql = f"""INSERT INTO USERS (name, email, password_hash, role_id, status, created_at)
VALUES ('{name}', '{email}', '{hashed_pw}', {role_id[role_name]}, 'active', '{now}');"""
        print(sql)
    print()
