import React from 'react';
import ReactDOM from 'react-dom';
import Dashboard from './Dashboard';
import Settings from './Settings';

const { urls, nonce, imageSizes } = window.smart_image_crop_ajax;
console.log(imageSizes)
const dashboardContainer = document.getElementById('smart_image_crop_dashboard');
const settingsContainer = document.getElementById('smart_image_crop_settings');
if (settingsContainer) {
  ReactDOM.render(<Settings nonce={nonce} urls={urls} />, settingsContainer);
  ReactDOM.render(<Dashboard urls={urls} nonce={nonce} imageSizes={imageSizes} />, dashboardContainer);
}