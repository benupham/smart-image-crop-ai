export const collateThumbs = (imagesJson, croppedSizes) => {
  const allThumbs = imagesJson.reduce((allacc, image) => {
    const thumbs = Object.entries(image.media_details.sizes).reduce((acc, [size, details]) => {
      if (croppedSizes.includes(size)) {
        const thumb = details
        thumb.size = size
        thumb.isChecked = false
        thumb.previewFile = ""
        thumb.attachment = {}
        thumb.attachment.id = image.id
        thumb.attachment.width = image.media_details.width
        thumb.attachment.height = image.media_details.height
        thumb.attachment.file = image.media_details.file
        thumb.attachment.source_url = image.guid.rendered
        thumb.url = thumb.source_url
        thumb.cacheId = Date.now()
        thumb.loading = false
        thumb.smartcrop = false
        acc.push(thumb)
      }
      return acc
    }, [])

    allacc.push(...thumbs)
    return allacc
  }, [])

  return allThumbs
}

export const getCroppedSizes = (sizes) => {
  const croppedSizes = Object.entries(sizes).reduce((acc, [size, details]) => {
    if (details.crop !== false) {
      const croppedSize = size
      acc.push(croppedSize)
    }
    return acc
  }, [])

  return croppedSizes
}
