import AdminShell from "../../components/layout/AdminShell";
import GalleryView from "../../components/gallery/GalleryView";

export default function AdminGallery() {
  return (
    <AdminShell>
      <div className="scr-title">Gallery</div>
      <div className="scr-sub">Photos and videos your team shares with the community</div>
      {/* Admins may manage any media in their own school, not just their uploads. */}
      <GalleryView canUpload canManage />
    </AdminShell>
  );
}