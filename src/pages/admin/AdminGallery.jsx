import AdminShell from "../../components/layout/AdminShell";
import GalleryView from "../../components/gallery/GalleryView";

export default function AdminGallery() {
  return (
    <AdminShell>
      <div className="scr-title">Gallery</div>
      <div className="scr-sub">Photos and videos your team shares with the community</div>
      <GalleryView canUpload canDelete />
    </AdminShell>
  );
}