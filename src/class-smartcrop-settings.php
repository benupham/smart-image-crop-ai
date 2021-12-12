<?php

class SmartCrop_Settings extends SmartCrop_WP_Base
{

    public function __construct()
    {
        parent::__construct();
    }

    public function admin_menu()
    {
        global $smartcrop_settings_page;
        $smartcrop_settings_page = add_options_page(
            __('Smart Image Crop AI Settings'),
            esc_html__('Smart Image Crop'),
            'manage_options',
            'smartcrop-settings',
            array($this, 'smartcrop_settings_do_page')
        );
    }

    public function add_options_to_page()
    {
        include dirname(__FILE__) . '/views/settings.php';
    }

    public function smartcrop_settings_do_page()
    {
?>
        <div id="smart_image_crop_settings"></div>
        <div id="smart_image_crop_dashboard"></div>
<?php
    }
}
