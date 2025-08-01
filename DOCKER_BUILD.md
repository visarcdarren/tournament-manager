# Tournament Manager Docker Build Instructions

## Quick Fix for Build Issues

If you're encountering build errors, use the simplified Docker configuration:

```bash
# Build with the simple Dockerfile
docker-compose -f docker-compose.simple.yml build

# Run the container
docker-compose -f docker-compose.simple.yml up -d
```

## First Time Setup

Before building the Docker image for the first time, make sure all dependencies are listed in package.json:

### Missing Dependencies Fixed:
- Added `@radix-ui/react-checkbox`
- Added `@radix-ui/react-radio-group`
- Removed dependency on `zustand/middleware/persist`
- Fixed import paths

### Build Steps:

1. **Use the simplified build**:
   ```bash
   docker-compose -f docker-compose.simple.yml build
   ```

2. **Or if you want to generate lock files first**:
   
   Windows:
   ```cmd
   generate-locks.bat
   docker-compose build
   ```
   
   Linux/Mac:
   ```bash
   chmod +x generate-locks.sh
   ./generate-locks.sh
   docker-compose build
   ```

## Common Build Issues

1. **Import errors**: Make sure all imports use the correct paths
2. **Missing dependencies**: Run `npm install` in both client and server directories
3. **PWA warnings**: These are non-fatal and can be ignored

## Quick Start After Build

```bash
# Start the application
docker-compose up -d

# Check logs
docker-compose logs -f

# Access at http://localhost:3001
```

## Troubleshooting

If the build still fails:

1. Check the specific error in the build output
2. Ensure all dependencies are listed in package.json
3. Try building locally first:
   ```bash
   cd client
   npm install
   npm run build
   ```

The fixes applied:
- Removed react-router-dom import (using custom routing)
- Added missing Trophy icon import
- Simplified PWA configuration
- Added placeholder manifest.json
