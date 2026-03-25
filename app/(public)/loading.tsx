import HomePageSkeleton from '@/app/components/skeletons/HomePageSkeleton'

/** Navigation dans le storefront : structure proche de l’accueil pour limiter le « flash » spinner. */
export default function PublicSegmentLoading() {
    return <HomePageSkeleton />
}
