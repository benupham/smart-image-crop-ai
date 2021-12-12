export const checkApiKey = async (apiKey) =>
  fetch(`https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`, { method: "POST" })
    .then((response) => response.json())
    .then((data) => {
      console.log("Google API response", data)
      if (!data.error) {
        return data
      } else {
        throw new Error(data.error.message)
      }
    })

export const requestSmartCrop = async (preview = true, thumb, setNotice, urls, nonce) => {
  const isPreview = preview === true ? 1 : 0
  const { size, attachment } = thumb
  const sizeURI = encodeURIComponent(size)
  const reqUrl = `${urls.proxy}?attachment=${attachment.id}&size=${sizeURI}&pre=${isPreview}`

  const response = await fetch(reqUrl, {
    headers: new Headers({ "X-WP-Nonce": nonce })
  })

  if (response.ok === false || response.status !== 200) {
    const error = await response.json()
    console.log("Error", error)
    const errorString = `Error: ${error.code}. Message: ${error.message}`
    setNotice([errorString, "error"])
    return false
  }

  const json = await response.json()

  if (json.success !== true) {
    console.log("JSON parse error", json)
    setNotice([json.body, "error"])
    return false
  }

  if (json.success === true) {
    thumb.smartcrop = true
    if (preview === true) {
      thumb.url = json.body.smartcrop.image_url
    } else {
      thumb.isChecked = false
      thumb.cacheId = Date.now()
      thumb.url = thumb.source_url
      thumb.previewFile = ""
    }

    return thumb
  }
}
