import PageHeader from "../../components/ui/PageHeader";
import GalleryView from "../../components/gallery/GalleryView";

export default function StaffGallery() {
  return (
    <>
      <PageHeader title="Gallery" subtitle="Photos and videos the school shares with the community" />
      {/* Staff browse the whole school gallery like an admin, but the per-item
          controls only appear on media they uploaded themselves. */}
      <GalleryView canUpload canManage />
    </>
  );
}
