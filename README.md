# SignFile

SignFile is a secure digital signature application built with Nuxt 3, allowing users to sign and verify files using personal certificates. It features a modern UI with Tailwind CSS, secure authentication with Okta, and a comprehensive admin panel.

![SignFile Logo](./images/logo/signfile_square_logo.png)

## Features

### File Signing and Verification

- **Sign Files**: Upload and sign files with PFX/PEM certificates
- **Verify Signatures**: Check the authenticity of signed files
- **Multiple File Support**: Process multiple files at once
- **Certificate Management**: Save certificates for reuse

### Modern User Interface

- **Responsive Layout**: Fullscreen layout with sidebar navigation
- **Tailwind CSS**: Modern styling with Tailwind CSS v4
- **Dark Mode Ready**: Theme color system with modernity, security, energy, care, and currency colors

### Secure Authentication

- **Okta Integration**: Login with Okta using Authorization Code flow with PKCE
- **Protected Admin Area**: Admin features are accessible only to authenticated users
- **Persistent Sessions**: Reliable authentication state management

### Administration

- **Certificate Management**: View and manage stored certificates
- **System Information**: View app version and system details
- **NPM Package Management**: View installed packages and versions
- **Okta Configuration**: Configure Okta connection settings directly in the UI

## Setup

Make sure to install dependencies:

```bash
# npm
npm install

# pnpm
pnpm install

# yarn
yarn install
```

## Development Server

Start the development server on `http://localhost:3000`:

```bash
# npm
npm run dev

# pnpm
pnpm dev

# yarn
yarn dev
```

## Production

Build the application for production:

```bash
# npm
npm run build

# pnpm
pnpm build

# yarn
yarn build
```

Start the production server:

```bash
# npm
npm run start

# pnpm
pnpm start

# yarn
yarn start
```

## Okta Configuration

SignFile requires Okta configuration to enable authentication:

1. Create an Okta developer account and application
2. Configure a Single-Page App (SPA) with the following:
   - Login redirect URI: `http://localhost:3000/login/callback`
   - Allowed grant types: Authorization Code, Implicit (Hybrid)
   - Client authentication: None (public client)
3. Enter your Okta configuration in the Admin panel:
   - Issuer URL (e.g., `https://{yourOktaDomain}/oauth2/default`)
   - Client ID from your Okta application
   - Redirect URI (`http://localhost:3000/login/callback`)
   - Post logout redirect URI (optional)
   - Scopes (default: `openid profile email`)

## Docker Support

A Dockerfile is included for containerized deployment:

```bash
# Build the Docker image
docker build -t signfile .

# Run the container
docker run -p 3000:3000 signfile
```

## License

© 2023-2024 SignFile - iBanFirst. All Rights Reserved.
