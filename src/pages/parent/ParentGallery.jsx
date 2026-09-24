import ParentShell from "../../components/layout/ParentShell";
import GalleryView from "../../components/gallery/GalleryView";

export default function ParentGallery() {
  return (
    <ParentShell>
      <div className="scr-title">Gallery</div>
      <div className="scr-sub">Photos and videos from your child's school</div>
      <GalleryView empty="No gallery photos or videos have been shared yet." />
    </ParentShell>
  );
}