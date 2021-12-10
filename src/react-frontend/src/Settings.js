import React, { useEffect, useState } from "react"
import { Accordion } from "./Accordion"

const Settings = ({ nonce, urls, croppedSizes }) => {
  const [apiKey, setApiKey] = useState("")
  const [errorMessage, setErrorMessage] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const [isSaving, setSaving] = useState(false)
  const [isGetting, setGetting] = useState(true)
  const updateApiKey = (event) => setApiKey(event.target.value)
  const updateSettings = async (event) => {
    event.preventDefault()
    setSaving(true)
    await fetch(urls.settings, {
      body: JSON.stringify({ apiKey }),
      method: "POST",
      headers: new Headers({
        "Content-Type": "application/json",
        "X-WP-Nonce": nonce
      })
    })
    setErrorMessage("")
    // check if API key is valid

    fetch(`https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`, { method: "POST" })
      .then((response) => response.json())
      .then((data) => {
        console.log(data)
        if (!data.error) {
          return data
        } else {
          throw new Error(data.error.message)
        }
      })
      .then(setSuccessMessage("API key saved and validated with Google API!"))
      .catch((error) => {
        setErrorMessage(`Key saved, but there was an error: ${error.message}`)
        setSuccessMessage("")
      })
    setSaving(false)
  }

  // get the key on settings page load
  useEffect(() => {
    const getSettings = async () => {
      let json = null
      let elapsed = false
      setGetting(true)
      // display loading for a minimum amount of time to prevent flashing
      setTimeout(() => {
        elapsed = true
        if (json) {
          setGetting(false)
        }
      }, 300)
      const response = await fetch(urls.settings, {
        headers: new Headers({ "X-WP-Nonce": nonce })
      })
      json = await response.json()
      setApiKey(json.value.apiKey)
      if (elapsed) {
        setGetting(false)
      }
    }
    getSettings()
  }, [nonce, urls])

  return (
    <div className="wrap">
      <h1>Smart Image Crop AI</h1>
      <Accordion title={"Settings"}>
        <form onSubmit={updateSettings}>
          <p>
            <label>
              Google Cloud Vision API Key:{" "}
              <input type="text" value={apiKey} onChange={updateApiKey} />
            </label>
          </p>
          {isGetting && <p>Loading...</p>}
          {!isGetting && !apiKey && (
            <p>
              <a
                href="https://cloud.google.com/vision/docs/setup"
                target="_blank"
                rel="noopener noreferrer">
                Get your Google Cloud Vision API key here.
              </a>
            </p>
          )}
          {errorMessage && (
            <div className="error settings-error">
              <p>{errorMessage}</p>
            </div>
          )}
          {successMessage && (
            <div className="notice notice-success">
              <p>{successMessage}</p>
            </div>
          )}
          <p>
            <button type="submit" className="button button-primary" disabled={isSaving}>
              Save API key
            </button>
          </p>
        </form>
        <div className="image-sizes-list">
          <h2>Cropped Image Sizes</h2>
          <p>Only these image sizes are eligible for smart cropping:</p>
          <ol>{croppedSizes && croppedSizes.map((size) => <li key={size}>{size}</li>)}</ol>
          <p>Other image sizes are not cropped only resized, and thus do not need smartcropping.</p>
        </div>
      </Accordion>
    </div>
  )
}

export default Settings
