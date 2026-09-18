import { useParams } from "react-router-dom";
import { useApi } from "../hooks/useApi";
import { getPublicSite, getPublicSiteByName } from "../api/website";
import { ErrorBanner, Spinner } from "../components/ui/Primitives";
import PublicSiteView from "../components/site/PublicSiteView";

export default function PublicWebsite() {
  const { schoolId, schoolName } = useParams();
  const fetcher = schoolName
    ? () => getPublicSiteByName(schoolName)
    : () => getPublicSite(schoolId);
  const { data: site, loading, error } = useApi(fetcher, [schoolId, schoolName]);

  if (loading) return <div className="public-site-state"><Spinner /></div>;
  if (error) return <div className="public-site-state"><ErrorBanner message={error} /></div>;

  return <PublicSiteView site={site} />;
}