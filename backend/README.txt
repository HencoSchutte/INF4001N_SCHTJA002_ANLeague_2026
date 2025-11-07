Admin Login:
  Username: admin
  Password: admin123

How to test admin-only routes:
  1. POST /admin/login with Basic Auth credentials
  2. Copy returned token
  3. Add ?token=<your_token> to URLs of admin endpoints
