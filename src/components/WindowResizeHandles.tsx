import { getCurrentWindow } from "@tauri-apps/api/window";

export function WindowResizeHandles() {
  const handleResize = (
    direction: "North" | "South" | "West" | "East" | "NorthWest" | "NorthEast" | "SouthWest" | "SouthEast"
  ) => {
    try {
      getCurrentWindow().startResizeDragging(direction);
    } catch (err) {
      console.warn("Resize dragging failed:", err);
    }
  };

  return (
    <>
      <div className="resize-handle handle-north" onMouseDown={() => handleResize("North")} />
      <div className="resize-handle handle-south" onMouseDown={() => handleResize("South")} />
      <div className="resize-handle handle-west" onMouseDown={() => handleResize("West")} />
      <div className="resize-handle handle-east" onMouseDown={() => handleResize("East")} />
      <div className="resize-handle handle-north-west" onMouseDown={() => handleResize("NorthWest")} />
      <div className="resize-handle handle-north-east" onMouseDown={() => handleResize("NorthEast")} />
      <div className="resize-handle handle-south-west" onMouseDown={() => handleResize("SouthWest")} />
      <div className="resize-handle handle-south-east" onMouseDown={() => handleResize("SouthEast")} />
    </>
  );
}
