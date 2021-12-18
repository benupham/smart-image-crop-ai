# Smart Crop Image IA WordPress Plugin
This plugin uses the power of machine learning to automatically re-center hard-cropped image sizes (sometimes called image thumbnails) in WordPress. 

Re-cropped images can be previewed first to see if you preferred the re-cropped version.

The only hard part about using this plugin is getting a Google Cloud Vision API key. Find out how to get started [[here](https://cloud.google.com/vision/docs/setup)].

## Development
Things to know:
- Uses React and the WP API for the frontend admin interface.
- Loads bundle.js on local, but for production uses the app-manifest.json in react-frontend/builds to enqueue the react JS and CSS
- A testing Google Cloud Vision key can be found in .env (git ignored)