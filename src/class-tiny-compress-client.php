<?php
/*
* Tiny Compress Images - WordPress plugin.
* Copyright (C) 2015-2018 Tinify B.V.
*
* This program is free software; you can redistribute it and/or modify it
* under the terms of the GNU General Public License as published by the Free
* Software Foundation; either version 2 of the License, or (at your option)
* any later version.
*
* This program is distributed in the hope that it will be useful, but WITHOUT
* ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
* FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for
* more details.
*
* You should have received a copy of the GNU General Public License along
* with this program; if not, write to the Free Software Foundation, Inc., 51
* Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA.
*/

if ( ! defined( '\Tinify\VERSION' ) ) {
	/* Load vendored client if it is not yet loaded. */
	require_once dirname( __FILE__ ) . '/vendor/tinify/Tinify/Exception.php';
	require_once dirname( __FILE__ ) . '/vendor/tinify/Tinify/ResultMeta.php';
	require_once dirname( __FILE__ ) . '/vendor/tinify/Tinify/Result.php';
	require_once dirname( __FILE__ ) . '/vendor/tinify/Tinify/Source.php';
	require_once dirname( __FILE__ ) . '/vendor/tinify/Tinify/Client.php';
	require_once dirname( __FILE__ ) . '/vendor/tinify/Tinify.php';
}

class Tiny_Compress_Client extends Tiny_Compress {
	private $last_error_code = 0;
	private $last_message = '';
	private $proxy;

	protected function __construct( $api_key, $after_compress_callback ) {
		parent::__construct( $after_compress_callback );

		$this->proxy = new WP_HTTP_Proxy();

		\Tinify\setAppIdentifier( self::identifier() );
		\Tinify\setKey( $api_key );
	}

	public function can_create_key() {
		return true;
	}

	public function get_compression_count() {
		return \Tinify\getCompressionCount();
	}

	public function get_remaining_credits() {
		return \Tinify\remainingCredits();
	}

	public function get_paying_state() {
		return \Tinify\payingState();
	}

	public function get_email_address() {
		return \Tinify\emailAddress();
	}

	public function get_key() {
		return \Tinify\getKey();
	}

	protected function validate() {
		try {
			$this->last_error_code = 0;
			$this->set_request_options( \Tinify\Tinify::getClient( \Tinify\Tinify::ANONYMOUS ) );
			\Tinify\Tinify::getClient()->request( 'get', '/keys/' . $this->get_key() );
			return true;

		} catch ( \Tinify\Exception $err ) {
			$this->last_error_code = $err->status;

			if ( 429 == $err->status || 400 == $err->status ) {
				return true;
			}

			throw new Tiny_Exception(
				$err->getMessage(),
				get_class( $err ),
				$err->status
			);
		}
	}

	protected function compress( $input, $resize_opts, $preserve_opts, $original_file, $size ) {
		try {

			if( $original_file && $size) {
				// Tiny_Plugin::write_log($original_file);
				// Tiny_Plugin::write_log(isset($size));
				$vertices = $this->get_gcv_crop_hint($original_file, $size);	
				$response_data = $this->smart_crop_image($original_file, $vertices, $size->dimensions, true);
				// Tiny_Plugin::write_log($response_data);
				$meta = array(
					'vertices' => $vertices
				);
				return $meta;
			}
			
			return null;

		} catch ( \Tinify\Exception $err ) {
			$this->last_error_code = $err->status;

			throw new Tiny_Exception(
				$err->getMessage(),
				get_class( $err ),
				$err->status
			);
		}// End try().
	}

	public function create_key( $email, $options ) {
		try {
			$this->last_error_code = 0;
			$this->set_request_options(
				\Tinify\Tinify::getClient( \Tinify\Tinify::ANONYMOUS )
			);

			\Tinify\createKey( $email, $options );
		} catch ( \Tinify\Exception $err ) {
			$this->last_error_code = $err->status;

			throw new Tiny_Exception(
				$err->getMessage(),
				get_class( $err ),
				$err->status
			);
		}
	}

	private function set_request_options( $client ) {
		/* The client does not let us override cURL properties yet, so we have
           to use a reflection property. */
		$property = new ReflectionProperty( $client, 'options' );
		$property->setAccessible( true );
		$options = $property->getValue( $client );

		if ( TINY_DEBUG ) {
			$file = fopen( dirname( __FILE__ ) . '/curl.log', 'w' );
			if ( is_resource( $file ) ) {
				$options[ CURLOPT_VERBOSE ] = true;
				$options[ CURLOPT_STDERR ] = $file;
			}
		}

		if ( $this->proxy->is_enabled() && $this->proxy->send_through_proxy( $url ) ) {
			$options[ CURLOPT_PROXYTYPE ] = CURLPROXY_HTTP;
			$options[ CURLOPT_PROXY ] = $this->proxy->host();
			$options[ CURLOPT_PROXYPORT ] = $this->proxy->port();

			if ( $this->proxy->use_authentication() ) {
				$options[ CURLOPT_PROXYAUTH ] = CURLAUTH_ANY;
				$options[ CURLOPT_PROXYUSERPWD ] = $this->proxy->authentication();
			}
		}
	}

	public function get_gcv_crop_hint($original_file, $size) {

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
			Tiny_Plugin::write_log($response);
			$vertices = $response->responses[0]->cropHintsAnnotation->cropHints[0]->boundingPoly->vertices;
			return $vertices;

		}			

	}

	public function smart_crop_image( $original_file, $crop_vertices, $thumb_dimensions, $is_preview = true) {
		
		$path_parts = pathinfo($original_file);
		$new_filename = 'smart-preview-' . $thumb_dimensions['width'] . 'x' . $thumb_dimensions['height'] . '-' . $path_parts['basename'];
		$new_filepath = $path_parts['dirname'] . '/' . $new_filename;
		// Tiny_Plugin::write_log('cropped image file: ' . $new_filepath);
		// Tiny_Plugin::write_log('cropped image filename: ' . $new_filename);
		$image_editor = wp_get_image_editor( $original_file );

		$src_x = isset($crop_vertices[0]->x) ? $crop_vertices[0]->x : 0;
		$src_y = isset($crop_vertices[0]->y) ? $crop_vertices[0]->y : 0;
		$src_w = $crop_vertices[1]->x - $src_x;
		$src_h = $crop_vertices[3]->y - $src_y;
	
		if ( ! is_wp_error( $image_editor ) ) {
			$image_editor->crop($src_x, $src_y, $src_w, $src_h);  
			$image_editor->resize( $thumb_dimensions['width'], $thumb_dimensions['height'], false );	
			$cropped_image = $image_editor->save( $new_filepath ); 
			// Tiny_Plugin::write_log($cropped_image);
			if ( ! is_wp_error( $cropped_image )) {
				$preview_thumb = array(
					'preview_file' => $new_filename,
					'preview_path' => $new_filepath,
				);
				return $preview_thumb;
			} else {
				Tiny_Plugin::write_log('there was an error cropping: ' . $cropped_image);
				return new WP_Error($cropped_image);
			}
	
		}
	}
}
