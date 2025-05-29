import React, {useEffect, useState} from 'react';
import {ActivityIndicator, Image, ScrollView, StyleSheet, Text, View} from 'react-native';
import {getPalette,} from '@somesoap/react-native-image-palette';
import {ResultsScreenProps} from "../types";

type Pill = {
    id: string;
    imprint: string;
    color: string;
    shape: string;
    name: string;
    description: string;
};

// Dummy data for pill identification (replace with real database lookup)
const dummyPills = [
    { id: '1', imprint: 'M 367', color: 'White', shape: 'Round', name: 'Acetaminophen 500mg', description: 'Pain reliever' },
    { id: '2', imprint: 'WATSON 349', color: 'White', shape: 'Oval', name: 'Hydrocodone/Acetaminophen', description: 'Opioid pain medication' },
    { id: '3', imprint: 'XANAX 0.5', color: 'Peach', shape: 'Oval', name: 'Alprazolam 0.5mg', description: 'Anxiety medication' },
    { id: '4', imprint: 'IBUPROFEN', color: 'Orange', shape: 'Round', name: 'Ibuprofen 200mg', description: 'NSAID' },
];

const ResultsScreen: React.FC<ResultsScreenProps> = ({ navigation, route }) => {
    const { imageUri } = route.params;
    const [isLoading, setIsLoading] = useState(true);
    const [extractedFeatures, setExtractedFeatures] = useState({
        imprint: 'Analyzing...',
        color: 'Analyzing...',
        shape: 'Analyzing...',
    });
    const [matchedPills, setMatchedPills] = useState<Pill[]>([]);

    useEffect(() => {
        const analyzeImage = async () => {
            setIsLoading(true);
            try {

                const dominantColor = await getPalette(imageUri).then(palette => palette.vibrant);

                setExtractedFeatures(prev => ({ ...prev, color: dominantColor }));

                // --- 2. Extract Text (Imprint) ---
                // This is where you'd integrate an OCR library.
                // For FOSS, you'd likely need a more complex setup with a pre-trained model or a cloud API.
                // Example with a placeholder:
                const detectedImprint = await performOCR(imageUri); // Placeholder for OCR function
                setExtractedFeatures(prev => ({ ...prev, imprint: detectedImprint }));

                // --- 3. Extract Shape ---
                // This is the most challenging part for FOSS on-device.
                // You'd need a trained model or complex image processing with OpenCV.
                // For demonstration, we'll assume a very basic shape detection based on aspect ratio or a placeholder.
                const detectedShape = await detectShape(imageUri); // Placeholder for shape detection
                setExtractedFeatures(prev => ({ ...prev, shape: detectedShape }));

                // --- 4. Match with Dummy Database ---
                const matched = dummyPills.filter(pill =>
                        (detectedImprint.toLowerCase().includes(pill.imprint.toLowerCase()) || pill.imprint.toLowerCase().includes(detectedImprint.toLowerCase())) &&
                        (dominantColor.toLowerCase().includes(pill.color.toLowerCase()) || pill.color.toLowerCase().includes(dominantColor.toLowerCase()))
                    // Add shape matching here if your `detectShape` is robust
                );
                setMatchedPills(matched);

            } catch (error) {
                console.error("Error analyzing image:", error);
                setExtractedFeatures({ imprint: 'Error', color: 'Error', shape: 'Error' });
                setMatchedPills([]);
            } finally {
                setIsLoading(false);
            }
        };

        analyzeImage();
    }, [imageUri]);

    // Placeholder for a simple OCR function (replace with real OCR logic)
    const performOCR = async (uri: string) => {
        // In a real app, you'd send the image to a service or an on-device ML model
        // For a FOSS approach, you might explore Tesseract.js (for web) or native bindings if available for React Native.
        // For now, let's simulate some common imprints based on simple image properties or a hardcoded guess.
        if (uri.includes('sample_pill_m367')) return 'M 367'; // Placeholder for specific sample images
        if (uri.includes('sample_pill_watson')) return 'WATSON 349';
        if (uri.includes('sample_pill_xanax')) return 'XANAX 0.5';
        if (uri.includes('sample_pill_ibuprofen')) return 'IBUPROFEN';

        // Simulate OCR time
        await new Promise(resolve => setTimeout(resolve, 1500));
        return 'UNKNOWN IMPRINT'; // Default if no specific match
    };

    // Placeholder for a simple shape detection (replace with real computer vision logic)
    const detectShape = async (uri: string) => {
        // This is highly simplified. Real shape detection requires advanced computer vision.
        // You'd use OpenCV functions like contour detection, aspect ratio analysis, etc.
        // For now, let's make a guess based on some simple logic.
        if (uri.includes('sample_pill_oval')) return 'Oval';
        if (uri.includes('sample_pill_round')) return 'Round';
        await new Promise(resolve => setTimeout(resolve, 1000));
        return 'Unknown';
    };

    return (
        <ScrollView style={styles.container}>
            <Text style={styles.title}>Analysis Results</Text>
            {imageUri && <Image source={{ uri: imageUri }} style={styles.image} />}

            {isLoading ? (
                <ActivityIndicator size="large" color="#0000ff" style={styles.loadingIndicator} />
            ) : (
                <View style={styles.featuresContainer}>
                    <Text style={styles.featureLabel}>Extracted Features:</Text>
                    <Text style={styles.featureText}>Imprint: {extractedFeatures.imprint}</Text>
                    <Text style={styles.featureText}>Dominant Color: {extractedFeatures.color}</Text>
                    <Text style={styles.featureText}>Shape: {extractedFeatures.shape}</Text>

                    <Text style={styles.matchTitle}>Potential Matches:</Text>
                    {matchedPills.length > 0 ? (
                        matchedPills.map(pill => (
                            <View key={pill.id} style={styles.pillCard}>
                                <Text style={styles.pillName}>{pill.name}</Text>
                                <Text>Imprint: {pill.imprint}</Text>
                                <Text>Color: {pill.color}</Text>
                                <Text>Shape: {pill.shape}</Text>
                                <Text>Description: {pill.description}</Text>
                            </View>
                        ))
                    ) : (
                        <Text style={styles.noMatchText}>No direct matches found based on extracted features. Try a clearer photo or adjust lighting.</Text>
                    )}
                </View>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#f5f5f5',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
    },
    image: {
        width: '100%',
        height: 300,
        resizeMode: 'contain',
        marginBottom: 20,
        borderRadius: 10,
        backgroundColor: '#eee',
    },
    loadingIndicator: {
        marginTop: 50,
    },
    featuresContainer: {
        backgroundColor: '#fff',
        padding: 15,
        borderRadius: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        marginBottom: 20,
    },
    featureLabel: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    featureText: {
        fontSize: 16,
        marginBottom: 5,
    },
    matchTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginTop: 20,
        marginBottom: 15,
    },
    pillCard: {
        backgroundColor: '#e6f7ff',
        padding: 15,
        borderRadius: 8,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#b3e0ff',
    },
    pillName: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 5,
        color: '#0056b3',
    },
    noMatchText: {
        fontStyle: 'italic',
        color: '#555',
    },
});

export default ResultsScreen;