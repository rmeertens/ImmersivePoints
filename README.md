# ImmersivePoints

## What is it?
ImmersivePoints is a web-application for virtual reality devices to explore 3D data in the most natural way possible. <br>
To view the data you need to either attach a virtual reality device attached to your PC, or a stand-alone one, such as the oculus quest.

## Explore examples

* [A frame from the AEV dataset](href="https://rmeertens.github.io/ImmersivePoints/oculus.html?name=e2652aab-4ace-4a09-86f4-374b23cb677b.xyzi)
* [A frame from the AEV dataset with semantic information](https://rmeertens.github.io/ImmersivePoints/oculus.html?name=816ca9a5-1eec-4e23-a34e-f409dbed1ff0.xyzi)
* [A brain with some information of a clustering algorithm](https://rmeertens.github.io/ImmersivePoints/oculus.html?name=77b04781-5d7c-445f-9e6a-65956758d644.xyzi)
* [The notre dame](https://rmeertens.github.io/ImmersivePoints/oculus.html?name=d6263c4a-7121-432f-8712-b0de530a78ff.xyzrgb)

## Upload your own
Want to see your own pointcloud in virtual reality? Upload your binary file [here](https://rmeertens.github.io/ImmersivePoints/upload.html)!
The binary file is expected to be in float32, and consist of XYZH values.
X, Y, and Z are floating point numbers in any range, but it's wise to position them around the point of origin of the virtual reality environment. 
The H-value signifies the hue of that point, which should be between 0.0 and 1.0 according to [this specification](https://threejs.org/docs/#api/en/math/Color.setHSL>this specification). 
Note that saturation and lightness are currently always set to 1.0.

## Export examples
Want to see some examples on how to export pointclouds? Take a look at:
* [this subsampling example](https://github.com/rmeertens/ImmersivePoints/blob/master/export_subsample.ipynb)
* [this example to export a CSV file](https://github.com/rmeertens/ImmersivePoints/blob/master/export_csv.ipynb)
* [this export of a PLY file](https://github.com/rmeertens/ImmersivePoints/blob/master/export_ply.ipynb)
* [this export of self driving car data](href="https://github.com/rmeertens/ImmersivePoints/blob/master/export_AEV_data.ipynb)

## All rights reserved. 
