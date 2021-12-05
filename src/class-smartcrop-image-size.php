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

class SmartCrop_Image_Size
{
    public $filename;
    public $dimensions;
    public $name_of_file;
    public $image_url;
    public $meta = array();

    public function __construct($filename = null, $dimensions = null, $url = null)
    {
        $this->filename = $filename;
        $this->dimensions = $dimensions;
        $this->url = $url;
        $this->get_name_of_file();
    }

    public function get_name_of_file()
    {
        /* Do not use pathinfo for getting the filename.
        It doesn't work when the filename starts with a special character. */
        $path_parts = explode('/', $this->filename);
        $this->name_of_file = end($path_parts);
    }

}
