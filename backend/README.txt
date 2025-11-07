Admin Login:
  Username: admin
  Password: admin123

How to test admin-only routes:
  1. POST /admin/login with Basic Auth credentials
  2. Copy returned token
  3. Add ?token=<your_token> to URLs of admin endpoints


MONGO_URI=mongodb+srv://hencoschutte2002_db_user:gUjPII0b1PTjvLWW@anl2026cluster.bjk4pzo.mongodb.net/?retryWrites=true&w=majority&appName=ANL2026Cluster
DATABASE_NAME=african_nations

JWT_SECRET=mvw9vy4mv9w337y9weewirkuwsewsiemfsebswietr4383w4
JWT_ALGORITHM=HS256
JWT_EXP_MINUTES=60

