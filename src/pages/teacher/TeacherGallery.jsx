import TeacherShell from "../../components/layout/TeacherShell";
import GalleryView from "../../components/gallery/GalleryView";

export default function TeacherGallery() {
  return (
    <TeacherShell>
      <div className="scr-title">Gallery</div>
      <div className="scr-sub">Share photos and videos with parents and the school</div>
      <GalleryView canUpload />
    </TeacherShell>
  );
}