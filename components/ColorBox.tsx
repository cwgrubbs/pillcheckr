import React from 'react';
import { View, StyleSheet } from 'react-native';

interface ColorBoxProps {
    color: string;
}

const ColorBox: React.FC<ColorBoxProps> = ({ color }) => {
    return (
        <View style={[styles.colorBox, { backgroundColor: color }]} />
    );
};

const styles = StyleSheet.create({
    colorBox: {
        width: 32,
        height: 32,
        margin: 8,
    },
});

export default ColorBox;
