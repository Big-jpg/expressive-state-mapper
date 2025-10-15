# Vercel Deployment Guide for ESM

## Repository Information

**GitHub Repository**: https://github.com/Big-jpg/expressive-state-mapper

The code has been pushed to your GitHub account and is ready for Vercel deployment.

## Deployment Steps

### 1. Import to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New..." → "Project"
3. Import from GitHub: `Big-jpg/expressive-state-mapper`
4. Vercel will auto-detect Next.js configuration

### 2. Configure Build Settings

Vercel should auto-detect these settings:

- **Framework Preset**: Next.js
- **Build Command**: `npm run build`
- **Output Directory**: `.next` (auto-detected)
- **Install Command**: `npm install`
- **Node Version**: 20.x (recommended)

### 3. Environment Variables (Optional for Demo)

For the demo version with mock database, no environment variables are required.

For production with PostgreSQL, add these in Vercel:

```
POSTGRES_URL=your_connection_string
POSTGRES_PRISMA_URL=your_pooling_connection_string
POSTGRES_URL_NON_POOLING=your_non_pooling_connection_string
POSTGRES_USER=your_user
POSTGRES_HOST=your_host
POSTGRES_PASSWORD=your_password
POSTGRES_DATABASE=esm_db
```

### 4. Deploy

Click "Deploy" and Vercel will:
- Install dependencies
- Build the Next.js application
- Deploy to a production URL

## Expected Build Configuration

The application includes:

- **Next.js 15.5.5** with App Router
- **React 19** components
- **Paper.js** for canvas (with custom webpack config)
- **Python scripts** for feature extraction (will run via Node.js child_process)
- **Mock database** for demo mode (no external DB needed)

## Python Dependencies

The Python scripts require:
- Python 3.11+
- numpy
- scipy

**Note**: Vercel supports Python via serverless functions, but the current implementation uses subprocess calls. If you encounter Python execution issues, you may need to:

1. Convert Python scripts to serverless functions
2. Or use Vercel's Python runtime
3. Or keep the mock database and disable feature extraction for the demo

## Known Build Warnings

You may see these warnings (they are non-critical):

```
Module not found: Can't resolve 'acorn' in paper.js
```

This is expected - Paper.js has optional dependencies that don't affect functionality.

## Post-Deployment Testing

Once deployed, test these features:

1. **Drawing Canvas**: Create a drawing with multiple strokes
2. **Save Drawing**: Click "Save Drawing" button
3. **Dashboard**: Switch to Dashboard tab (will show data after 3+ drawings)
4. **Feature Extraction**: Check browser console for feature extraction logs

## Troubleshooting

### Build Fails with TypeScript Errors

If you see TypeScript errors, add this to `next.config.js`:

```javascript
typescript: {
  ignoreBuildErrors: true,
}
```

### Python Scripts Don't Execute

The Python feature extraction may not work on Vercel's serverless environment. Options:

1. **Keep mock features**: Modify feature extraction to return mock data
2. **Use Vercel Functions**: Convert Python scripts to serverless functions
3. **External API**: Deploy Python service separately (e.g., Railway, Render)

### Database Connection Issues

The current deployment uses an in-memory mock database, so no external database is needed for demo purposes.

## Alternative: Deploy with Database

If you want to use PostgreSQL:

1. Set up a Vercel Postgres database
2. Add environment variables
3. Update API routes to use `@vercel/postgres` instead of `mock-db`
4. Redeploy

## Repository Structure

```
expressive-state-mapper/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   └── page.tsx           # Main page
├── components/            # React components
│   ├── DrawingCanvas.tsx  # Paper.js canvas
│   └── Dashboard.tsx      # Recharts dashboard
├── lib/                   # Utilities
│   ├── types.ts           # TypeScript types
│   ├── schemas.ts         # Zod schemas
│   └── mock-db.ts         # In-memory database
├── python/                # Python services
│   ├── feature_extractor.py
│   └── baseline_analyzer.py
├── db/                    # Database schema
│   └── schema.sql
├── next.config.js         # Next.js configuration
├── package.json           # Dependencies
└── README.md              # Documentation
```

## Support

If you encounter any build issues, share the Vercel build logs and I'll help troubleshoot!

---

**Repository**: https://github.com/Big-jpg/expressive-state-mapper  
**Status**: Ready for Vercel deployment

