import { isInteger } from "lodash"

/**
 *
 * @param {json} imagesJson All images returned from the API
 * @param {json} croppedSizes The hard-cropped image sizes in WP
 * @param {boolean} filterCropped Whether to filter out already smartcropped images
 * @returns
 */
export const collateThumbs = (imagesJson, croppedSizes, filterCropped) => {
  const allThumbs = imagesJson.reduce((allacc, image) => {
    console.log(image)

    const thumbs = Object.entries(image.media_details.sizes).reduce((acc, [size, details]) => {
      if (
        filterCropped &&
        image.smartcrop &&
        Object.prototype.hasOwnProperty.call(image.smartcrop, size) &&
        isInteger(image.smartcrop[size])
      ) {
        console.log("already cropped")
        return acc
      }

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
