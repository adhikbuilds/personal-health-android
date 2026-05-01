// WellnessPlaceholderScreen — replaced "Coming Soon" with real wellness dashboard.
// Immediately redirects to WellnessScreen, which now has full functionality.
// Kept as a named route to avoid breaking any existing navigator references.
import { useEffect } from 'react';

export default function WellnessPlaceholderScreen({ navigation, route }) {
    useEffect(() => {
        navigation.replace('Wellness', route.params || {});
    }, [navigation, route.params]);

    return null;
}
