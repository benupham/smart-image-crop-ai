<?php

class GCV_Client {

  public function get_crop_hint($original_file, $size) {

    $width = $size->dimensions['width'];
    $height = $size->dimensions['height'];
    $aspect_ratio = $width / $height;
    $is_preview = false;
    $img = file_get_contents($original_file);
    $data = base64_encode($img);
    Tiny_Plugin::write_log('aspect ratio: ' . $aspect_ratio);
    $baseurl = 'https://vision.googleapis.com/v1/images:annotate';
    $apikey = get_option('smart_image_crop_api_key');
    $body = array(
      'requests' => array(
        array(
          'features' => array(
            array(
              'type' => 'CROP_HINTS'
              )          
            ),
          'image' => array(
            'content' => $data
            // 'source' => array(
            //   'imageUri' => $data
            //   )
            ),
          'imageContext' => array(
            'cropHintsParams' => array(
              'aspectRatios' => array(
                $aspect_ratio
              )
            )
          )
        )
      ) 
    );
  
    $request = wp_remote_post( $baseurl . '?key=' . $apikey, array(
      'headers'     => array('Content-Type' => 'application/json'),
      'body'        => json_encode($body),
      'method'      => 'POST',
      'data_format' => 'body',
    ));
    $response_code = wp_remote_retrieve_response_code( $request );
    $response_message = wp_remote_retrieve_response_message( $request );
    Tiny_Plugin::write_log('response code: ' . $response_code);
    Tiny_Plugin::write_log('response message: ' . $response_message);
    if ( 200 != $response_code && ! empty( $response_message ) ) {
      return new WP_Error( $response_code, $response_message );
    } elseif ( 200 != $response_code ) {
      return new WP_Error( $response_code, 'Unknown error occurred' );
    } else {
      $response = json_decode(wp_remote_retrieve_body($request));
      // Tiny_Plugin::write_log($response);
      $vertices = $response->responses[0]->cropHintsAnnotation->cropHints[0]->boundingPoly->vertices;
      // Tiny_Plugin::write_log($vertices);
      return $vertices;
  
    }			
  
  }

}


