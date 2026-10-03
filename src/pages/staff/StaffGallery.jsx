import StaffShell from "../../components/layout/StaffShell";
import GalleryView from "../../components/gallery/GalleryView";

export default function StaffGallery() {
  return (
    <StaffShell>
      <div className="scr-title">Gallery</div>
      <div className="scr-sub">Photos and videos the school shares with the community</div>
      {/* Staff browse the whole school gallery like an admin, but the per-item
          controls only appear on media they uploaded themselves. */}
      <GalleryView canUpload canManage />
    </StaffShell>
  );
}
