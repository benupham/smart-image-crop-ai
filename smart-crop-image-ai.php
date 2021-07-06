<?php
/**
 * Plugin Name: Smart Crop Image AI
 * Description: Use the power of AI to crop your images perfectly.
 * Version: beta
 * Author: Ben Upham
 * Text Domain: tiny-compress-images
 * License: GPLv2 or later
 */

require dirname( __FILE__ ) . '/src/config/class-tiny-config.php';
require dirname( __FILE__ ) . '/src/class-tiny-php.php';
require dirname( __FILE__ ) . '/src/class-tiny-wp-base.php';
require dirname( __FILE__ ) . '/src/class-tiny-exception.php';
require dirname( __FILE__ ) . '/src/class-tiny-compress.php';
require dirname( __FILE__ ) . '/src/class-tiny-bulk-optimization.php';
require dirname( __FILE__ ) . '/src/class-tiny-image-size.php';
require dirname( __FILE__ ) . '/src/class-tiny-image.php';
require dirname( __FILE__ ) . '/src/class-tiny-settings.php';
require dirname( __FILE__ ) . '/src/class-tiny-plugin.php';
require dirname( __FILE__ ) . '/src/class-tiny-notices.php';
require dirname( __FILE__ ) . '/src/compatibility/wpml/class-tiny-wpml.php';

require dirname( __FILE__ ) . '/src/class-gcv-client.php';

if ( Tiny_PHP::client_supported() ) {
	require dirname( __FILE__ ) . '/src/class-tiny-compress-client.php';
} else {
	/* override */ 
	require dirname( __FILE__ ) . '/src/class-tiny-compress-client.php';
}

if ( ! defined( 'SMART_PREVIEWS_URL') ) {
	define( 'SMART_PREVIEWS_URL', plugin_dir_url( __FILE__ ) . 'preview-images' );
}
if ( ! defined( 'SMART_PREVIEWS_PATH') ) {
	define( 'SMART_PREVIEWS_PATH', plugin_dir_path( __FILE__ ) . 'preview-images' );
}



$tiny_plugin = new Tiny_Plugin();
