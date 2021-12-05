import React from "react";
import ReactDOM from "react-dom";
import Dashboard from "./Dashboard";
import Settings from "./Settings";
import { getCroppedSizes } from "./helper";

const { urls, nonce, imageSizes } = window.smart_image_crop_ajax;
const croppedSizes = getCroppedSizes(imageSizes);

const dashboardContainer = document.getElementById(
  "smart_image_crop_dashboard"
);
const settingsContainer = document.getElementById("smart_image_crop_settings");
if (settingsContainer && dashboardContainer) {
  ReactDOM.render(
    <Settings nonce={nonce} urls={urls} croppedSizes={croppedSizes} />,
    settingsContainer
  );
  ReactDOM.render(
    <Dashboard
      urls={urls}
      nonce={nonce}
      imageSizes={imageSizes}
      croppedSizes={croppedSizes}
    />,
    dashboardContainer
  );
}
