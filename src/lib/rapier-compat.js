import * as RapierModule from '@dimforge/rapier3d-compat/rapier.es.js'
import initWasm from '@dimforge/rapier3d-compat/rapier_wasm3d.js'
import wasmUrl from '@dimforge/rapier3d-compat/rapier_wasm3d_bg.wasm?url'

let initPromise

export async function init(options = {}) {
  if (!initPromise) {
    const wasmSource = options.wasm ?? wasmUrl
    initPromise = initWasm(wasmSource).catch((error) => {
      initPromise = undefined
      throw error
    })
  }

  return initPromise
}

const patchedDefault = {
  ...RapierModule.default,
  init,
}

export {
  ActiveCollisionTypes,
  ActiveEvents,
  ActiveHooks,
  Ball,
  BroadPhase,
  CCDSolver,
  Capsule,
  CharacterCollision,
  CoefficientCombineRule,
  Collider,
  ColliderDesc,
  ColliderSet,
  ColliderShapeCastHit,
  Cone,
  ConvexPolyhedron,
  Cuboid,
  Cylinder,
  DebugRenderBuffers,
  DebugRenderPipeline,
  DynamicRayCastVehicleController,
  EventQueue,
  FeatureType,
  FixedImpulseJoint,
  FixedMultibodyJoint,
  GenericImpulseJoint,
  HalfSpace,
  HeightFieldFlags,
  Heightfield,
  ImpulseJoint,
  ImpulseJointSet,
  IntegrationParameters,
  IslandManager,
  JointAxesMask,
  JointData,
  JointType,
  KinematicCharacterController,
  MassPropsMode,
  MotorModel,
  MultibodyJoint,
  MultibodyJointSet,
  NarrowPhase,
  PhysicsPipeline,
  PidAxesMask,
  PidController,
  PointColliderProjection,
  PointProjection,
  Polyline,
  PrismaticImpulseJoint,
  PrismaticMultibodyJoint,
  Quaternion,
  QueryFilterFlags,
  QueryPipeline,
  Ray,
  RayColliderHit,
  RayColliderIntersection,
  RayIntersection,
  RevoluteImpulseJoint,
  RevoluteMultibodyJoint,
  RigidBody,
  RigidBodyDesc,
  RigidBodySet,
  RigidBodyType,
  RopeImpulseJoint,
  RotationOps,
  RoundCone,
  RoundConvexPolyhedron,
  RoundCuboid,
  RoundCylinder,
  RoundTriangle,
  SdpMatrix3,
  SdpMatrix3Ops,
  Segment,
  SerializationPipeline,
  Shape,
  ShapeCastHit,
  ShapeContact,
  ShapeType,
  SolverFlags,
  SphericalImpulseJoint,
  SphericalMultibodyJoint,
  SpringImpulseJoint,
  TempContactForceEvent,
  TempContactManifold,
  TriMesh,
  TriMeshFlags,
  Triangle,
  UnitImpulseJoint,
  UnitMultibodyJoint,
  Vector3,
  VectorOps,
  World,
  version,
} from '@dimforge/rapier3d-compat/rapier.es.js'

export default patchedDefault
