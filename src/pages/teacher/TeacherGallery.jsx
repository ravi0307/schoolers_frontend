import TeacherShell from "../../components/layout/TeacherShell";
import GalleryView from "../../components/gallery/GalleryView";

export default function TeacherGallery() {
  return (
    <TeacherShell>
      <div className="scr-title">Gallery</div>
      <div className="scr-sub">Share photos and videos with parents and the school</div>
      {/* canUpload: teachers may add to the gallery. canManage: they may edit
          and remove their own uploads — controls appear per item, since
          another teacher's photos stay read-only for them. */}
      <GalleryView canUpload canManage />
    </TeacherShell>
  );
}