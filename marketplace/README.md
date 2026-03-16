# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type aware lint rules:

- Configure the top-level `parserOptions` property like this:

```js
export default tseslint.config({
  languageOptions: {
    // other options...
    parserOptions: {
      project: ['./tsconfig.node.json', './tsconfig.app.json'],
      tsconfigRootDir: import.meta.dirname,
    },
  },
})
```

- Replace `tseslint.configs.recommended` to `tseslint.configs.recommendedTypeChecked` or `tseslint.configs.strictTypeChecked`
- Optionally add `...tseslint.configs.stylisticTypeChecked`
- Install [eslint-plugin-react](https://github.com/jsx-eslint/eslint-plugin-react) and update the config:

```js
// eslint.config.js
import react from 'eslint-plugin-react'

export default tseslint.config({
  // Set the react version
  settings: { react: { version: '18.3' } },
  plugins: {
    // Add the react plugin
    react,
  },
  rules: {
    // other rules...
    // Enable its recommended rules
    ...react.configs.recommended.rules,
    ...react.configs['jsx-runtime'].rules,
  },
})
```


ssh -i C:\Users\ernes\test-folder\.mysecret\do_key_openss root@165.22.244.60

Using WinSCP:

1️⃣ Open WinSCP
Launch WinSCP.
Click New Site.

2️⃣ Enter your droplet’s connection info
Field	Value
File protocol	SFTP
Host name	165.22.244.60 (your droplet IP)
Port number	22
User name	root (or your server user with the public key)
Password	leave blank (we’ll use a private key)

3️⃣ Configure your private key
Click Advanced → SSH → Authentication.
Under Private key file, browse to your converted OpenSSH key (do_key_openssh).
⚠ If you still have .ppk only, use PuTTYgen to convert it to OpenSSH, as we discussed earlier.


Startup Setup

1️⃣ Update the package list
sudo apt update

2️⃣ Install Node.js + npm
Option A: Install Node.js from Ubuntu repo (may be older version):
sudo apt install nodejs npm -y

Option B (recommended): Install latest LTS Node.js via NodeSource:
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash - sudo apt install nodejs -y

3️⃣ Verify installation
node -v
npm -v

Should print the versions of Node.js and npm, e.g.:
v24.14.0
9.6.7

4️⃣ Optional: Install PM2 globally
PM2 keeps your backend running even if you close SSH:
sudo npm install -g pm2

Verify:
pm2 -v

After this, you can go into your backend and marketplace folders and run:

npm install
…to install project dependencies.


Full Deployment Workflow
1️⃣ SSH into your droplet
ssh -i C:\Users\ernes\.ssh\do_key_openssh root@165.22.244.60
2️⃣ Update system and install Node.js + npm
sudo apt update
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt install nodejs -y

Check installation:

node -v
npm -v

Install PM2 globally:

sudo npm install -g pm2
pm2 -v
3️⃣ Install PostgreSQL
sudo apt install postgresql postgresql-contrib -y
sudo systemctl start postgresql
sudo systemctl enable postgresql

Check PostgreSQL status:

sudo systemctl status postgresql
4️⃣ Set up your database

Switch to PostgreSQL user:

sudo -i -u postgres
psql

Create a database and user (replace dbuser / password / ecommerce_db with your own):

CREATE DATABASE ecommerce_db;
CREATE USER dbuser WITH ENCRYPTED PASSWORD 'password';
GRANT ALL PRIVILEGES ON DATABASE ecommerce_db TO dbuser;
\q
exit
5️⃣ Configure backend .env

Create a .env file in your backend folder:

cd /root/ecomm-minimax/backend
nano .env

Example .env:

PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_USER=dbuser
DB_PASS=password
DB_NAME=ecommerce_db

Save and exit (Ctrl+O, Enter, Ctrl+X in nano).

6️⃣ Install dependencies
Backend:
cd /root/ecomm-minimax/backend
npm install
Frontend / marketplace:
cd /root/ecomm-minimax/marketplace
npm install
7️⃣ Build frontend
cd /root/ecomm-minimax/marketplace
npm run build

This creates production-ready files in the dist/ folder.

8️⃣ Start backend with PM2
cd /root/ecomm-minimax/backend
pm2 start index.js --name ecommerce-backend

Replace index.js with your backend entry point if different.

Save PM2 process list to restart on reboot:

pm2 save
pm2 startup
9️⃣ Serve frontend (optional)

If backend does not serve static frontend, use serve:

cd /root/ecomm-minimax/marketplace
sudo npm install -g serve
serve -s dist -l 3000

Or configure your backend to serve /dist files.

10️⃣ Verify everything

Check backend logs:

pm2 logs ecommerce-backend

Open browser: http://<your-droplet-ip>:5000 (backend) or http://<your-droplet-ip>:3000 (frontend) depending on setup.

✅ Notes / best practices

Do not copy node_modules from local — install fresh on droplet.

Do not copy .env from local — create on droplet.

Use PM2 for keeping backend running.

Future updates: upload files → npm install → rebuild frontend → pm2 restart ecommerce-backend.



backend:
 npm start

frontend/marketplace:
 npm run dev -- --h