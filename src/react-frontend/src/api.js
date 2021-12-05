export const request = async (endpoint, params = {}) => {
  const { urls } = window.smart_image_crop_ajax;
  const connector = urls.proxy.indexOf("?") > -1 ? "&" : "?"; // check for query param in existing WP URL (depends on permalink settings)
  const response = await fetch(
    `${urls.proxy}${connector}${new URLSearchParams(
      Object.entries({
        ...params,
        endpoint,
      })
    )}`
  );
  const json = await response.json();
  if (json.code === "SUCCESS") {
    return json.data;
  } else {
    throw new Error(json.message);
  }
};

export const runCropping = async (cropSettings) =>
  request(`/run/`, cropSettings);
export const getSuite = async (suiteId) => request(`/suites/${suiteId}/`);
export const getSuiteTests = async (suiteId) =>
  request(`/suites/${suiteId}/tests/`);
export const executeSuite = async (suiteId) =>
  request(`/suites/${suiteId}/execute`, { immediate: 1 });
export const getSuiteResults = async (suiteResultId) =>
  request(`/suite-results/${suiteResultId}/results/`);
