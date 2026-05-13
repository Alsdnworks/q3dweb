# q3dviewer

q3dviewer is a VS Code extension for viewing point cloud files (`.pcd`, `.ply`, `.las`, `.laz`, `.e57`) in 3D.
It embeds a q3dweb-based WebView so you can inspect point clouds directly inside the editor by rotating, panning, and zooming.

## Features

- Open `.pcd`, `.ply`, `.las`, `.laz`, `.e57` files in a VS Code custom editor
- Rotate, pan, and zoom with the mouse; fly through with the keyboard
- Adjust point size, alpha, color mode, and display range from the settings menu
- Check the loaded point count on the cloud tab
- Measure distance between two points
- Film Maker tab: add / preview camera key frames and record a fly-through
- Settings panel remembers the active tab when toggled with `M`

## Usage

1. Install this extension in VS Code.
2. Open a `.pcd`, `.ply`, `.las`, `.laz`, or `.e57` file.
3. If the file does not open automatically, use "Reopen With..." and select
   **Point Cloud Viewer**.
4. Press `M` to show / hide the settings panel.

## Controls

| Input | Action |
| --- | --- |
| Right drag | Rotate |
| Left drag | Pan |
| Mouse wheel | Zoom |
| `W` `A` `S` `D` `Z` `X` | Move camera |
| `Shift` + move keys | Faster movement |
| `Ctrl + Left Click` | Measure distance between two points |
| `Ctrl + Right Click` | Reset measurement points |
| `M` | Toggle settings menu (preserves the active tab) |
| `Space` (Film Maker tab) | Add key frame from current camera |
| `Delete` (Film Maker tab) | Remove current key frame |

## Supported Formats

- **PCD** (`.pcd`): binary and ASCII
- **PLY** (`.ply`): ASCII, binary little-endian, binary big-endian
- **LAS** (`.las`): point data record formats 0–3, 6–8
- **LAZ** (`.laz`): LAZ-compressed LAS via `laz-perf`
- **E57** (`.e57`): XYZ / RGB / intensity via a bundled Rust + WebAssembly reader
- Large files are transferred to the WebView in chunks to keep memory use bounded

## Current Limitations

- `binary_compressed` PCD is not supported.
- E57: fields beyond XYZ + RGB / intensity are decoded best-effort only.
- Extremely large clouds may exceed browser memory; a pre-load estimate is
  surfaced in the settings panel when available.

## Links
* Source code
  - [q3dweb](https://github.com/Panasonic-Advanced-Technology/q3dweb)
  - [q3dviewer](https://github.com/scomup/q3dviewer)
* Documentation
  - [VSCode とブラウザで使える軽量点群ビューアを作ってみた](https://qiita.com/hrpad/items/588474a1b70d413104f8)
  - [自作の3D点群ビューアーをオープンソース化してみた](https://qiita.com/scomup/items/75c942678c5be47e23e2)

## License

MIT. See `LICENSE.txt` in the packaged extension.
