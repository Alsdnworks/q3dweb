use std::io::Cursor;
use wasm_bindgen::prelude::*;
use e57::{CartesianCoordinate, E57Reader};

#[wasm_bindgen]
pub struct Points {
    positions: Vec<f32>,
    colors: Vec<f32>,
    intensities: Vec<f32>,
    has_color: bool,
    has_intensity: bool,
}

#[wasm_bindgen]
impl Points {
    #[wasm_bindgen(getter)]
    pub fn positions(&self) -> js_sys::Float32Array {
        js_sys::Float32Array::from(self.positions.as_slice())
    }

    #[wasm_bindgen(getter)]
    pub fn colors(&self) -> js_sys::Float32Array {
        js_sys::Float32Array::from(self.colors.as_slice())
    }

    #[wasm_bindgen(getter)]
    pub fn intensities(&self) -> js_sys::Float32Array {
        js_sys::Float32Array::from(self.intensities.as_slice())
    }

    #[wasm_bindgen(getter, js_name = hasColor)]
    pub fn has_color(&self) -> bool {
        self.has_color
    }

    #[wasm_bindgen(getter, js_name = hasIntensity)]
    pub fn has_intensity(&self) -> bool {
        self.has_intensity
    }

    #[wasm_bindgen(getter, js_name = pointCount)]
    pub fn point_count(&self) -> usize {
        self.positions.len() / 3
    }
}

/// Parse the first point cloud of an E57 file.
/// Returns positions (xyz interleaved), colors (rgb 0..1 interleaved) and
/// intensities (0..1 normalized by the library based on the intensity limits).
#[wasm_bindgen(js_name = parsePoints)]
pub fn parse_points(data: &[u8]) -> Result<Points, JsError> {
    let cursor = Cursor::new(data.to_vec());
    let mut reader = E57Reader::new(cursor).map_err(|e| JsError::new(&format!("{e}")))?;

    let clouds = reader.pointclouds();
    let first = clouds
        .into_iter()
        .next()
        .ok_or_else(|| JsError::new("E57 file contains no point clouds"))?;

    let has_color = first.has_color();
    let has_intensity = first.has_intensity();

    let iter = reader
        .pointcloud_simple(&first)
        .map_err(|e| JsError::new(&format!("{e}")))?;

    let estimated = first.records as usize;
    let mut positions = Vec::with_capacity(estimated * 3);
    let mut colors: Vec<f32> = if has_color {
        Vec::with_capacity(estimated * 3)
    } else {
        Vec::new()
    };
    let mut intensities: Vec<f32> = if has_intensity {
        Vec::with_capacity(estimated)
    } else {
        Vec::new()
    };

    for p in iter {
        let p = p.map_err(|e| JsError::new(&format!("{e}")))?;
        match p.cartesian {
            CartesianCoordinate::Valid { x, y, z } => {
                positions.push(x as f32);
                positions.push(y as f32);
                positions.push(z as f32);
            }
            _ => continue,
        }
        if has_color {
            match p.color {
                Some(c) => {
                    colors.push(c.red);
                    colors.push(c.green);
                    colors.push(c.blue);
                }
                None => {
                    colors.push(0.0);
                    colors.push(0.0);
                    colors.push(0.0);
                }
            }
        }
        if has_intensity {
            intensities.push(p.intensity.unwrap_or(0.0));
        }
    }

    Ok(Points {
        positions,
        colors,
        intensities,
        has_color,
        has_intensity,
    })
}
