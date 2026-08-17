import {
  forwardRef,
  memo,
  useCallback,
  useImperativeHandle,
  useState,
} from "react";
import Cropper, { type Area } from "react-easy-crop";

interface CropperRef {
  getCroppedAreaPixels: () => Area | null;
}

interface MemoReactCropperProps {
  image: string;
  width?: number;
  height?: number;
}

const MemoReactCropper = forwardRef<CropperRef, MemoReactCropperProps>(
  ({ image, width = 320, height = 320 }, ref) => {
    const [crop, setCrop] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(
      null
    );

    useImperativeHandle(ref, () => ({
      getCroppedAreaPixels: () => croppedAreaPixels,
    }));

    const onCropComplete = useCallback(
      (croppedArea: Area, croppedAreaPixels: Area) => {
        setCroppedAreaPixels(croppedAreaPixels);
      },
      []
    );

    return (
      <div className="relative w-full bg-[#dfd7d7]" style={{ height: `${height}px`, minHeight: 200 }}>
        <Cropper
          image={image}
          crop={crop}
          zoom={zoom}
          aspect={width / height}
          onCropChange={setCrop}
          onCropComplete={onCropComplete}
          onZoomChange={setZoom}
        />
      </div>
    );
  }
);

const EasyReactCropper = memo(MemoReactCropper);

export default EasyReactCropper;
