# ImmersivePoints

<p><a href="oculus.html?name=cars">A frame from the kitti dataset</a></p>
            <p><a href="oculus.html?name=cars2">A frame from the kitti dataset</a></p>
            <p><a href="oculus.html?name=brain">A brain</a></p>
            <p><a href="oculus.html?name=notredame">The notre dame. Taken from this point scan: </a>https://sketchfab.com/3d-models/notre-dame-paris-facade-hi-res-point-cloud-50deeb164f324d1c8607bafa67f948b9</p>
            https://sketchfab.com/3d-models/notre-dame-paris-facade-hi-res-point-cloud-50deeb164f324d1c8607bafa67f948b9




Want to see your own pointcloud in virtual reality? Upload your binary file here! <br>
            The binary file is expected to be in float32, and consist of XYZH values. <br>
            X, Y, and Z are floating point numbers in any range, but it's wise to position them around the point of origin of the virtual reality environment. <br>
            The H-value signifies the hue of that point, which should be between 0.0 and 1.0 according to <a href=https://threejs.org/docs/#api/en/math/Color.setHSL>this specification</a>. Note that saturation and lightness are currently always set to 1.0. <br>

                Want to see some examples on how to export pointclouds? Take a look <a href="https://github.com/rmeertens/ImmersivePoints/blob/master/export_subsample.ipynb">at this subsampling example</a>, <a href="https://github.com/rmeertens/ImmersivePoints/blob/master/export_csv.ipynb">this example to export a CSV file.</a>, <a href="https://github.com/rmeertens/ImmersivePoints/blob/master/export_ply.ipynb">or this export of a PLY file</a>, <a href="https://github.com/rmeertens/ImmersivePoints/blob/master/export_AEV_data.ipynb">or finally: export data from a self-driving car</a>.


All rights reserved. 
