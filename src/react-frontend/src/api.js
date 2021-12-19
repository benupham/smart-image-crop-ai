export const checkApiKey = async (apiKey) =>
  fetch(`https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`, { method: "POST" })
    .then((response) => response.json())
    .then((data) => {
      if (!data.error) {
        return data
      } else {
        throw new Error(data.error.message)
      }
    })

export const requestSmartCrop = async (preview = true, thumb, urls, nonce) => {
  const isPreview = preview === true ? 1 : 0
  const { size, attachment } = thumb
  const sizeURI = encodeURIComponent(size)
  const reqUrl = `${urls.proxy}?attachment=${attachment.id}&size=${sizeURI}&pre=${isPreview}`
  console.log("request smart crop", reqUrl)
  const response = await fetch(reqUrl, {
    headers: new Headers({ "X-WP-Nonce": nonce, "Cache-Control": "no-cache" })
  })

  const data = await response.json()

  if (response.ok === false || response.status !== 200) {
    console.log("Request smart crop error", data)
    const errorString = `Error: ${data.code}. Message: ${data.message}`
    data.cropError = errorString
    return data
  }

  if (data.success !== true) {
    console.log("data parse errors", data)
    data.cropError = data.body
    return data
  }

  if (data.success === true) {
    console.log("Smart crop returned", data)
    thumb.smartcrop = true
    thumb.isLoading = false
    if (preview === true) {
      thumb.url = data.body.smartcrop.image_url
    } else {
      thumb.isChecked = false
      thumb.cacheId = Date.now()
      thumb.url = thumb.source_url
      thumb.previewFile = ""
    }

    return thumb
  }
}
