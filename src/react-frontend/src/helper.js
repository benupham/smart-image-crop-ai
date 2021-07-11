
export const collateThumbs = (imagesJson, croppedSizes) => {

  const allThumbs = imagesJson.reduce( (allacc, image) => {     

    const thumbs = Object.entries(image.media_details.sizes).reduce((acc, [size, details]) => {
      
      if (croppedSizes.includes(size)) {
        const thumb = details;
        thumb.size = size; 
        thumb.isChecked = false; 
        thumb.previewFile = '';
        thumb.attachment = {};
        thumb.attachment.id = image.id; 
        thumb.attachment.width = image.media_details.width;
        thumb.attachment.height = image.media_details.height;
        thumb.attachment.file = image.media_details.file;
        thumb.attachment.source_url = image.guid.rendered;
        thumb.url = thumb.source_url;
        thumb.cacheId = Date.now();
        acc.push(thumb);
      }
      return acc; 

    }, []);

    allacc.push(...thumbs);
    return allacc;

  }, [])

  return allThumbs;

}

export const getCroppedSizes = () => {

  if (!window.smart_image_crop_ajax || !window.smart_image_crop_ajax.imageSizes) return

  const sizes = window.smart_image_crop_ajax.imageSizes; 

  const croppedSizes = Object.entries(sizes).reduce((acc, [size,details]) => {
    if (details.crop !== false) {
      const croppedSize = size;
      acc.push(croppedSize);
    }
    return acc; 
  }, []);

  return croppedSizes;

}



// export const getSmartCrop = async (size, originalId, [width,height]) => {
//   const reqUrl = `${proxy}?image=${originalId}&width=${width}&height=${height}&size=${size}`
//   console.log('reqURL',reqUrl)
//   const response = await fetch(reqUrl, {
//     headers: new Headers({ 'X-WP-Nonce': nonce}),
//   })
//   console.log('response', response)
//   const data = await response.json();
//   const cropHint = data;
//   console.log('data', data)

// }

// export const saveCrop = async (originalId, thumbUri) => {
//   if (cropHints.length === 0) getCropHint(); 
//   const newThumbUrl = await fetch(proxy, {
//     headers: new Headers({ 'X-WP-Nonce': nonce}),

//   })
// }
