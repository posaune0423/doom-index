"use client";

import React from "react";
import { DoubleSide } from "three";

export const GalleryRoom: React.FC = () => {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[10, 10]} />
        <meshStandardMaterial color="#4b4d68" roughness={0.48} metalness={0.26} side={DoubleSide} />
      </mesh>
      <mesh position={[0, 1.65, 5]} rotation={[0, Math.PI, 0]} receiveShadow>
        <planeGeometry args={[10, 4.5]} />
        <meshStandardMaterial color="#6c6d89" roughness={0.84} metalness={0.11} side={DoubleSide} />
      </mesh>
      <mesh rotation={[0, -Math.PI / 2, 0]} position={[5, 1.65, 0]} receiveShadow>
        <planeGeometry args={[10, 4.5]} />
        <meshStandardMaterial color="#686a86" roughness={0.84} metalness={0.11} side={DoubleSide} />
      </mesh>
      <mesh rotation={[0, Math.PI / 2, 0]} position={[-5, 1.65, 0]} receiveShadow>
        <planeGeometry args={[10, 4.5]} />
        <meshStandardMaterial color="#686a86" roughness={0.84} metalness={0.11} side={DoubleSide} />
      </mesh>
      <mesh position={[0, 1.65, -5]} receiveShadow>
        <planeGeometry args={[10, 4.5]} />
        <meshStandardMaterial color="#686a86" roughness={0.84} metalness={0.11} side={DoubleSide} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 3.3, 0]} receiveShadow>
        <planeGeometry args={[7, 7]} />
        <meshStandardMaterial color="#2d2d40" roughness={0.72} metalness={0.14} side={DoubleSide} />
      </mesh>
    </group>
  );
};
