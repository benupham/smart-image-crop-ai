<?php

class Tiny_Image
{
    const ORIGINAL = 0;

    private $settings;
    private $id;
    private $name;
    private $wp_metadata;
    private $sizes = array();
    private $statistics = array();

    public function __construct(
        $settings,
        $id,
        $wp_metadata = null,
        $tiny_metadata = null,
        $active_sizes = null,
        $active_tinify_sizes = null
    ) {
        $this->settings = $settings;
        $this->id = $id;
        $this->original_filename = null;
        $this->wp_metadata = $wp_metadata;
        $this->parse_wp_metadata();
        $this->parse_tiny_metadata($tiny_metadata);
        $this->detect_duplicates($active_sizes, $active_tinify_sizes);
    }

    private function parse_wp_metadata()
    {
        if (!is_array($this->wp_metadata)) {
            $this->wp_metadata = wp_get_attachment_metadata($this->id);
        }
        if (!is_array($this->wp_metadata)) {
            return;
        }
        if (!isset($this->wp_metadata['file'])) {
            /* No file metadata found, this might be another plugin messing with
            metadata. Simply ignore this! */
            return;
        }

        $upload_dir = wp_upload_dir();
        $path_prefix = $upload_dir['basedir'] . '/';
        $path_info = pathinfo($this->wp_metadata['file']);
        if (isset($path_info['dirname'])) {
            $path_prefix .= $path_info['dirname'] . '/';
        }

        /* Do not use pathinfo for getting the filename.
        It doesn't work when the filename starts with a special character. */
        $path_parts = explode('/', $this->wp_metadata['file']);
        $this->name = end($path_parts);
        $filename = $path_prefix . $this->name;
        $this->original_filename = $filename;

        $this->sizes[self::ORIGINAL] = new Tiny_Image_Size($filename);

        if (isset($this->wp_metadata['sizes']) && is_array($this->wp_metadata['sizes'])) {
            foreach ($this->wp_metadata['sizes'] as $size_name => $info) {
                // Adding an array of width/height
                $dimensions = array(
                    'width' => $info['width'],
                    'height' => $info['height'],
                );

                $url = wp_get_attachment_image_src($this->id, $size_name)[0];

                $this->sizes[$size_name] = new Tiny_Image_Size($path_prefix . $info['file'], $dimensions, $url);
            }
        }
    }

    private function detect_duplicates($active_sizes, $active_tinify_sizes)
    {
        $filenames = array();

        if (is_array($this->wp_metadata)
            && isset($this->wp_metadata['file'])
            && isset($this->wp_metadata['sizes'])
            && is_array($this->wp_metadata['sizes'])) {

            if (null == $active_sizes) {
                $active_sizes = $this->settings->get_sizes();
            }
            if (null == $active_tinify_sizes) {
                $active_tinify_sizes = $this->settings->get_active_tinify_sizes();
            }

            foreach ($this->wp_metadata['sizes'] as $size_name => $size) {
                if ($this->sizes[$size_name]->has_been_compressed()
                    && array_key_exists($size_name, $active_sizes)) {
                    $filenames = $this->duplicate_check($filenames, $size['file'], $size_name);
                }
            }
            foreach ($this->wp_metadata['sizes'] as $size_name => $size) {
                if (in_array($size_name, $active_tinify_sizes, true)) {
                    $filenames = $this->duplicate_check($filenames, $size['file'], $size_name);
                }
            }
            foreach ($this->wp_metadata['sizes'] as $size_name => $size) {
                if (array_key_exists($size_name, $active_sizes)) {
                    $filenames = $this->duplicate_check($filenames, $size['file'], $size_name);
                }
            }
            foreach ($this->wp_metadata['sizes'] as $size_name => $size) {
                $filenames = $this->duplicate_check($filenames, $size['file'], $size_name);
            }
        }
    }

    private function duplicate_check($filenames, $file, $size_name)
    {
        if (isset($filenames[$file])) {
            if ($filenames[$file] != $size_name) {
                $this->sizes[$size_name]->mark_duplicate($filenames[$file]);
            }
        } else {
            $filenames[$file] = $size_name;
        }
        return $filenames;
    }

    private function parse_tiny_metadata($tiny_metadata)
    {
        if (is_null($tiny_metadata)) {
            $tiny_metadata = get_post_meta($this->id, Tiny_Config::META_KEY, true);
        }
        if ($tiny_metadata) {
            foreach ($tiny_metadata as $size => $meta) {
                if (!isset($this->sizes[$size])) {
                    if (self::is_retina($size) && Tiny_Settings::wr2x_active()) {
                        $size_name = rtrim($size, '_wr2x');
                        if ('original' === $size_name) {
                            $size_name = '0';
                        }
                        $retina_path = wr2x_get_retina(
                            $this->sizes[$size_name]->filename
                        );
                        $this->sizes[$size] = new Tiny_Image_Size($retina_path);
                    } else {
                        $this->sizes[$size] = new Tiny_Image_Size();
                    }
                }
                $this->sizes[$size]->meta = $meta;
            }
        }
    }

    public function get_id()
    {
        return $this->id;
    }

    public function get_name()
    {
        return $this->name;
    }

    public function get_original_filename()
    {
        return $this->original_filename;
    }

    public function get_wp_metadata()
    {
        return $this->wp_metadata;
    }

    public function file_type_allowed()
    {
        return in_array($this->get_mime_type(), array('image/jpeg', 'image/png'));
    }

    public function get_mime_type()
    {
        return get_post_mime_type($this->id);
    }

    public function compress()
    {
        if ($this->settings->get_compressor() === null || !$this->file_type_allowed()) {
            return;
        }

        /* Integration tests need to be written before this can be enabled. */
        // if ( $this->settings->has_offload_s3_installed() ) {
        //     $this->download_missing_image_sizes();
        // }

        $success = 0;
        $failed = 0;

        $compressor = $this->settings->get_compressor();
        $active_tinify_sizes = $this->settings->get_active_tinify_sizes();
        $uncompressed_sizes = $this->filter_image_sizes('uncompressed', $active_tinify_sizes);

        foreach ($uncompressed_sizes as $size_name => $size) {
            if (!$size->is_duplicate()) {
                $size->add_tiny_meta_start();
                $this->update_tiny_post_meta();
                $resize = $this->settings->get_resize_options($size_name);
                $preserve = $this->settings->get_preserve_options($size_name);
                try {
                    $response = $compressor->compress_file($size->filename, $resize, $preserve, $this->original_filename, $size);
                    $size->add_tiny_meta($response);
                    $success++;
                } catch (Tiny_Exception $e) {
                    $size->add_tiny_meta_error($e);
                    $failed++;
                }
                $this->add_wp_metadata($size_name, $size);
                $this->update_tiny_post_meta();
            }
        }

        /*
        Other plugins can hook into this action to execute custom logic
        after the image sizes have been compressed, ie. cache flushing.
         */
        do_action('tiny_image_after_compression', $this->id, $success);

        return array(
            'success' => $success,
            'failed' => $failed,
        );
    }

    public function check_for_preview_image($size_name)
    {

        $size = $this->get_image_size($size_name);
        if (file_exists(SMART_PREVIEWS_PATH . '/' . $size->name_of_file)) {
            return true;
        }
        return false;

    }

    public function get_smartcrop($size_name, $is_preview)
    {

        $size = $this->get_image_size($size_name);

        $smartcrop_meta = get_post_meta($this->id, 'smartcrop', true);

        $gcv_credit = 0;

        $response = array(
            'is_preview' => $is_preview,
            'gcv_api' => $gcv_credit,
        );

        // If there's already a generated preview image, return that
        if ($this->check_for_preview_image($size_name)) {
            Tiny_Plugin::write_log('already a preview image');
            error_log('already a preview image');
            if ($is_preview) {

                $response['image_url'] = SMART_PREVIEWS_URL . '/' . $size->name_of_file;

            } else {

                $this->replace_size_with_preview($size_name);
                $this->update_smartcrop_meta($size_name, $smartcrop_meta[$size_name]['vertices'], $is_preview);
                Tiny_Plugin::write_log($size->url);
                error_log("The URL of the size: {$size->url}");
                $response['image_url'] = $size->url;

            }

            return $response;

        }

        // If we already have smartcrop meta, use that to generate preview
        if ($smartcrop_meta && isset($smartcrop_meta[$size_name]) && isset($smartcrop_meta[$size_name]['vertices'])) {
            Tiny_Plugin::write_log('already vertices meta');
            error_log('already vertices meta');
            $vertices = $smartcrop_meta[$size_name]['vertices'];

        } else {
            // We have no existing preview and no existing vertices meta, so go to Google
            error_log('going to Google');
            $gcv_client = new GCV_Client();
            $vertices = $gcv_client->get_crop_hint($this->original_filename, $size);

            if (is_wp_error($vertices)) {
                error_log(print_r($vertices));
                return $vertices;
            }

            $response['gcv_api'] = 1;

        }

        $crop_data = $this->create_smart_crop_image($this->original_filename, $vertices, $size_name, $is_preview);

        if (is_wp_error($crop_data)) {
            Tiny_Plugin::write_log($crop_data);
            error_log($crop_data);
            return $crop_data;
        }

        $response['image_url'] = $crop_data;

        return $response;

    }

    private function create_smart_crop_image($original_file, $crop_vertices, $size_name, $is_preview = true)
    {

        $size = $this->get_image_size($size_name);

        $cropped_file_path = $is_preview ? SMART_PREVIEWS_PATH . '/' . $size->name_of_file : $size->filename;

        Tiny_Plugin::write_log('cropped image file: ' . $cropped_file_path);

        $image_editor = wp_get_image_editor($original_file);

        if (is_wp_error($image_editor)) {
            Tiny_Plugin::write_log($image_editor->get_error_message());
            return $image_editor;
        }

        $src_x = isset($crop_vertices[0]->x) ? $crop_vertices[0]->x : 0;
        $src_y = isset($crop_vertices[0]->y) ? $crop_vertices[0]->y : 0;
        $src_w = $crop_vertices[1]->x - $src_x;
        $src_h = $crop_vertices[3]->y - $src_y;

        $image_editor->crop($src_x, $src_y, $src_w, $src_h);
        $image_editor->resize($size->dimensions['width'], $size->dimensions['height'], false);

        $cropped_image_data = $image_editor->save($cropped_file_path);

        if (is_wp_error($cropped_image_data)) {
            Tiny_Plugin::write_log($cropped_image_data->get_error_message());
            return $cropped_image_data;
        }

        $this->update_smartcrop_meta($size_name, $crop_vertices, $is_preview);

        $image_url = $is_preview ? plugins_url($size->name_of_file, $cropped_file_path)
        : $size->url;

        return $image_url;

    }

    public function replace_size_with_preview($size_name)
    {

        $size = $this->get_image_size($size_name);
        $original_file_path = $size->filename;
        $preview_file = $size->name_of_file;
        $preview_file_path = SMART_PREVIEWS_PATH . '/' . $preview_file;

        // Tiny_Plugin::write_log('preview file path: ' . $preview_file_path);
        // Tiny_Plugin::write_log('original file path: ' . $original_file_path);

        if (file_exists($preview_file_path)) {

            $smartcropped_image = file_get_contents($preview_file_path);
            $result = file_put_contents($original_file_path, $smartcropped_image);

            if (is_wp_error($result) || $result == false) {
                Tiny_Plugin::write_log($result->get_error_message());
                return $result;
            }

            unlink($preview_file_path);
            Tiny_Plugin::write_log('deleted ' . $preview_file_path);

            return true;

        }

        return false;

    }

    public function update_smartcrop_meta($size_name, $vertices, $is_preview)
    {

        $metadata = array(
            'is_preview' => $is_preview,
            'vertices' => $vertices,
            'time' => time(),
        );

        $smartcrop_meta = get_post_meta($this->id, 'smartcrop', true);

        if (!is_array($smartcrop_meta)) {

            $smartcrop_meta = array(
                $size_name => $metadata,
            );

        } else {

            $smartcrop_meta[$size_name] = $metadata;

        }

        $result = update_post_meta($this->id, 'smartcrop', $smartcrop_meta);

        /*
        This action is being used by WPML:
        https://gist.github.com/srdjan-jcc/5c47685cda4da471dff5757ba3ce5ab1
         */
        do_action('update_smartcrop_meta', $this->id, 'smartcrop', $smartcrop_meta);
    }

    /**
     * Below here are useless functions...for now.
     */

    public function compress_retina($size_name, $path)
    {
        if ($this->settings->get_compressor() === null || !$this->file_type_allowed()) {
            return;
        }

        if (!isset($this->sizes[$size_name])) {
            $this->sizes[$size_name] = new Tiny_Image_Size($path);
        }
        $size = $this->sizes[$size_name];

        if (!$size->has_been_compressed()) {
            $size->add_tiny_meta_start();
            $this->update_tiny_post_meta();
            $compressor = $this->settings->get_compressor();
            $preserve = $this->settings->get_preserve_options($size_name);

            try {
                $response = $compressor->compress_file($path, false, $preserve);
                $size->add_tiny_meta($response);
            } catch (Tiny_Exception $e) {
                $size->add_tiny_meta_error($e);
            }
            $this->update_tiny_post_meta();
        }
    }

    public function remove_retina_metadata()
    {
        // Remove metadata from all sizes, as this callback only fires when all
        // retina sizes are deleted.
        foreach ($this->sizes as $size_name => $size) {
            if (self::is_retina($size_name)) {
                unset($this->sizes[$size_name]);
            }
        }
        $this->update_tiny_post_meta();
    }

    public function add_wp_metadata($size_name, $size)
    {
        if (self::is_original($size_name)) {
            if (isset($size->meta['output'])) {
                $output = $size->meta['output'];
                if (isset($output['width']) && isset($output['height'])) {
                    $this->wp_metadata['width'] = $output['width'];
                    $this->wp_metadata['height'] = $output['height'];
                }
            }
        }
    }

    public function update_tiny_post_meta()
    {
        $tiny_metadata = array();
        foreach ($this->sizes as $size_name => $size) {
            $tiny_metadata[$size_name] = $size->meta;
        }
        $result = update_post_meta($this->id, Tiny_Config::META_KEY, $tiny_metadata);
        $the_meta = get_post_custom_values(Tiny_Config::META_KEY, $this->id);
        // Tiny_Plugin::write_log('the meta update result: ' . $result);
        // Tiny_Plugin::write_log($the_meta);
        ;
        /*
        This action is being used by WPML:
        https://gist.github.com/srdjan-jcc/5c47685cda4da471dff5757ba3ce5ab1
         */
        do_action('updated_tiny_postmeta', $this->id, Tiny_Config::META_KEY, $tiny_metadata);
    }

    public function get_image_sizes()
    {
        $original = isset($this->sizes[self::ORIGINAL])
        ? array(
            self::ORIGINAL => $this->sizes[self::ORIGINAL],
        )
        : array();
        $compressed = array();
        $uncompressed = array();
        foreach ($this->sizes as $size_name => $size) {
            if (self::is_original($size_name)) {
                continue;
            }

            if ($size->has_been_compressed()) {
                $compressed[$size_name] = $size;
            } else {
                $uncompressed[$size_name] = $size;
            }
        }
        ksort($compressed);
        ksort($uncompressed);
        return $original + $compressed + $uncompressed;
    }

    public function get_image_size($size = self::ORIGINAL, $create = false)
    {
        if (isset($this->sizes[$size])) {
            return $this->sizes[$size];
        } elseif ($create) {
            return new Tiny_Image_Size();
        } else {
            return null;
        }
    }

    public function filter_image_sizes($method, $filter_sizes = null)
    {
        $selection = array();
        if (is_null($filter_sizes)) {
            $filter_sizes = array_keys($this->sizes);
        }
        foreach ($filter_sizes as $size_name) {
            if (!isset($this->sizes[$size_name])) {
                continue;
            }

            $tiny_image_size = $this->sizes[$size_name];
            if ($tiny_image_size->$method()) {
                $selection[$size_name] = $tiny_image_size;
            }
        }
        return $selection;
    }

    public function get_count($methods, $count_sizes = null)
    {
        $stats = array_fill_keys($methods, 0);
        if (is_null($count_sizes)) {
            $count_sizes = array_keys($this->sizes);
        }
        foreach ($count_sizes as $size) {
            if (!isset($this->sizes[$size])) {
                continue;
            }

            foreach ($methods as $method) {
                if ($this->sizes[$size]->$method()) {
                    $stats[$method]++;
                }
            }
        }
        return $stats;
    }

    public function get_latest_error()
    {
        $active_tinify_sizes = $this->settings->get_active_tinify_sizes();
        $error_message = null;
        $last_timestamp = null;
        foreach ($this->sizes as $size_name => $size) {
            if (in_array($size_name, $active_tinify_sizes, true)) {
                if (isset($size->meta['error']) && isset($size->meta['message'])) {
                    if (null === $last_timestamp || $last_timestamp < $size->meta['timestamp']) {
                        $last_timestamp = $size->meta['timestamp'];
                        $error_message = mb_strimwidth($size->meta['message'], 0, 140, '...');
                    }
                }
            }
        }
        return $error_message;
    }

    public function get_savings($stats)
    {
        $before = $stats['initial_total_size'];
        $after = $stats['optimized_total_size'];
        if (0 === $before) {
            $savings = 0;
        } else {
            $savings = ($before - $after) / $before * 100;
        }
        return '' . number_format($savings, 1);
    }

    public function get_statistics($active_sizes, $active_tinify_sizes)
    {
        if ($this->statistics) {
            error_log('Strangely the image statistics are asked for again.');
            return $this->statistics;
        }

        $this->statistics['initial_total_size'] = 0;
        $this->statistics['optimized_total_size'] = 0;
        $this->statistics['image_sizes_optimized'] = 0;
        $this->statistics['available_unoptimized_sizes'] = 0;

        foreach ($this->sizes as $size_name => $size) {
            if (!$size->is_duplicate()) {
                if (array_key_exists($size_name, $active_sizes)) {
                    if (isset($size->meta['input'])) {
                        $input = $size->meta['input'];
                        $this->statistics['initial_total_size'] += intval($input['size']);
                        if (isset($size->meta['output'])) {
                            $output = $size->meta['output'];
                            if ($size->modified()) {
                                $this->statistics['optimized_total_size'] += $size->filesize();
                                if (in_array($size_name, $active_tinify_sizes, true)) {
                                    $this->statistics['available_unoptimized_sizes'] += 1;
                                }
                            } else {
                                $this->statistics['optimized_total_size']
                                += intval($output['size']);
                                $this->statistics['image_sizes_optimized'] += 1;
                            }
                        } else {
                            $this->statistics['optimized_total_size'] += intval($input['size']);
                        }
                    } elseif ($size->exists()) {
                        $this->statistics['initial_total_size'] += $size->filesize();
                        $this->statistics['optimized_total_size'] += $size->filesize();
                        if (in_array($size_name, $active_tinify_sizes, true)) {
                            $this->statistics['available_unoptimized_sizes'] += 1;
                        }
                    }
                }
            }
        } // End foreach().

        /*
        When an image hasn't yet been optimized but only exists on S3, we still need to
        know the total size of the image sizes for the bulk optimization tool.
        TODO: First write integration tests before enabling this again.

        if (
        0 === $this->statistics['initial_total_size'] &&
        0 === $this->statistics['optimized_total_size'] &&
        $this->settings->has_offload_s3_installed()
        ) {
        $s3_data = get_post_meta( $this->id, 'wpos3_filesize_total', true );
        if ( $s3_data ) {
        $this->statistics['initial_total_size'] = $s3_data;
        $this->statistics['optimized_total_size'] = $s3_data;
        }
        }
         */

        return $this->statistics;
    }

    public static function is_original($size)
    {
        return self::ORIGINAL === $size;
    }

    public static function is_retina($size)
    {
        return strrpos($size, 'wr2x') === strlen($size) - strlen('wr2x');
    }
}
