import { Box, Button, Checkbox, Slider } from "@mantine/core";
import Matter, { Bodies, Body, Common, Composite, Engine, Events, IEventCollision, IMouseEvent, Render, Runner, World } from "matter-js";
import { useCallback, useEffect, useRef, useState } from "react";
import { BODIES_LABElS } from "./utils";

// Key Constants
const WIDTH = 800;
const HEIGHT = 800;
const BALL_RADIUS = 10;
const PEG_GAP = 4 * BALL_RADIUS;
const PEG_RADIUS = 0.2 * BALL_RADIUS;
const X_GAP = PEG_GAP;
const Y_GAP = 0.5 * X_GAP;
const MAX_BALLS = 150;
const ROWS = 10;
const WALL_WIDTH = WIDTH * 2;
const WALL_THICKNESS = 10;
const RESTITUTION = 0.6;
const FRICTION = 0.05;
const FRICTION_AIR = 0.06;
const SLOP = 0;
const GRAVITY = 1;
const ENGINE = Engine.create( {
	positionIterations: 20,
	gravity: { x: 0, y: 0.5, scale: 0.01 }
} );

const Scene = () => {
	const sceneRef = useRef<HTMLDivElement>( null );
	const [checked, setChecked] = useState( true );
	useEffect( () => {
		const render = Render.create( {
			element: sceneRef.current as HTMLDivElement,
			engine: ENGINE,
			options: { width: WIDTH, height: HEIGHT, wireframes: false }
		} );
		Render.run( render );
		const runner = Runner.create();
		Runner.run( runner, ENGINE );

		const mouse = Matter.Mouse.create( render.canvas );
		const mouseConstraint = Matter.MouseConstraint.create( ENGINE, {
			mouse,
			constraint: { stiffness: 0.2, render: { visible: true, type: 'pin' } }
		} );
		render.mouse = mouse;

		Events.on( ENGINE, "collisionStart", handleCollision );
		Events.on( ENGINE, "collisionEnd", handleCollisionEnd );
		Events.on( mouseConstraint, "mousedown", handleMouseDown );

		createPegs( ROWS );
		createPartitions( ROWS );
		createBalls( 5 );

		Composite.add( ENGINE.world, [mouseConstraint, ...createWalls()] );

		// Custom rendering function to display text on partitions
		( function customRender() {
			const ctx = render.context;
			ctx.font = "14px Arial";
			ctx.fillStyle = "white";
			ENGINE.world.bodies.forEach( body => {
				const label: string[] = [BODIES_LABElS.PARTITION_POINT, BODIES_LABElS.PARTITION]
				if ( label.includes( body.label ) && body.plugin.text ) {
					ctx.fillText( body.plugin.text, body.position.x, body.position.y );
					ctx.textAlign = "center";
					ctx.textBaseline = "middle";
				}

			} );
			requestAnimationFrame( customRender );
		} )();

		return () => {
			Runner.stop( runner );
			Events.off( ENGINE, "collisionStart", handleCollision );
			Events.off( ENGINE, "collisionEnd", handleCollisionEnd );
			Events.off( ENGINE, "mousedown", handleMouseDown );
			Render.stop( render );
			Engine.clear( ENGINE );
		};
	}, [] );

	const handleCollision = ( event: IEventCollision<any> ) => {
		event.pairs.forEach( pair => {
			if ( pair.bodyA.label === BODIES_LABElS.PEG ) {
				pair.bodyA.render.lineWidth = 15;
				setTimeout( () => {
					pair.bodyA.render.lineWidth = 1
				}, 200 );
			}
			if ( pair.bodyA.label === BODIES_LABElS.PARTITION ) {
				World.remove( ENGINE.world, pair.bodyB );
				Matter.Body.setPosition( pair.bodyA, {
					x: pair.bodyA.position.x,
					y: pair.bodyA.position.y + 10
				} );
				pair.bodyA.render.fillStyle = 'navy';
				// const scale = 1.1;
				// Matter.Body.scale( pair.bodyA, scale, scale );
				recoredPoints( pair.bodyA );
				setTimeout( () => {
					// Matter.Body.scale( pair.bodyA, 1 / scale, 1 / scale );
					Matter.Body.setPosition( pair.bodyA, {
						x: pair.bodyA.position.x,
						y: pair.bodyA.position.y - 10
					} );
					pair.bodyA.render.fillStyle = 'red';
				}, 200 );
			}
		} );
	};

	const recoredPoints = ( bodyA: Body ) => {
		const PARTITION_POINT = ENGINE.world.bodies.filter( ( body ) => body.label === BODIES_LABElS.PARTITION_POINT )
		if ( PARTITION_POINT.length >= 3 ) {
			World.remove( ENGINE.world, PARTITION_POINT[0] ); // Remove first added body
		}
		const width = bodyA.bounds.max.x - bodyA.bounds.min.x;
		const height = bodyA.bounds.max.y - bodyA.bounds.min.y;
		const newBody = Bodies.rectangle( 50, 50, width, height, {
			render: { fillStyle: 'blue' },
			label: BODIES_LABElS.PARTITION_POINT,
			isStatic: true,
			restitution: RESTITUTION,
			friction: FRICTION,
			frictionAir: FRICTION_AIR,
			plugin: { text: bodyA.plugin.text }
		} );
		World.add( ENGINE.world, newBody );
		const afterAddToWorld = ENGINE.world.bodies.filter( ( body ) => body.label === BODIES_LABElS.PARTITION_POINT )
		afterAddToWorld.forEach( ( body, idx ) => {
			Matter.Body.setPosition( body, {
				x: WIDTH - 50,
				y: 50 * ( idx + 1 )
			} );
		} )
	};

	const handleCollisionEnd = ( _event: IEventCollision<any> ) => {
	};

	const createWalls = () => {
		const options = { isStatic: true, restitution: 1, density: 1, render: { fillStyle: "red" } };
		return [
			Bodies.rectangle( 0, 0, WALL_WIDTH, WALL_THICKNESS, { ...options, label: BODIES_LABElS.WALL_TOP } ),
			Bodies.rectangle( 0, HEIGHT, WALL_WIDTH, WALL_THICKNESS, { ...options, label: BODIES_LABElS.WALL_BOTTOM } ),
			Bodies.rectangle( 0, 0, WALL_THICKNESS, WALL_WIDTH, { ...options, label: BODIES_LABElS.WALL_LEFT } ),
			Bodies.rectangle( WIDTH, 0, WALL_THICKNESS, WALL_WIDTH, { ...options, label: BODIES_LABElS.WALL_RIGHT } )
		];
	};

	const createPegs = ( rows: number ) => {
		for ( let row = 5; row < rows + 5; row++ ) {
			const yOffset = Y_GAP * ( row - 5 ) + 10;
			const xRowOffset = ( X_GAP * row - X_GAP ) / 2;
			for ( let j = 0; j < row; j++ ) {
				World.add( ENGINE.world, Bodies.circle(
					WIDTH / 2 - xRowOffset + X_GAP * j,
					100 + yOffset,
					PEG_RADIUS,
					{ restitution: RESTITUTION, friction: FRICTION, isStatic: true, render: { fillStyle: 'white' }, label: BODIES_LABElS.PEG }
				) );
			}
		}
	};

	const createPartitions = ( rows: number ) => {
		const columns = rows + 6
		const texts = Array.from( { length: ( columns + 1 ) / 2 }, ( _, index ) => {
			const value = ( 10 / ( index + 1 ) );
			return value % 1 === 0 ? value : parseFloat( value.toFixed( 1 ) ); // Remove .0 for whole numbers
		} )
		const texts2 = [...texts, ...texts.reverse().slice( 1 )]
		for ( let i = 1; i < columns; i++ ) {
			const partition = Bodies.rectangle(
				WIDTH / 2 - ( ( rows + 5 ) * PEG_GAP ) / 2 + ( i - 0.5 ) * PEG_GAP,
				HEIGHT / 2 - 50,
				35, 50,
				{
					isStatic: true, restitution: RESTITUTION, friction: FRICTION, frictionAir: FRICTION_AIR, slop: SLOP,
					render: {
						fillStyle: 'red',
						lineWidth: 1,
						// sprite: {
						// 	texture: 'https://cdn.pixabay.com/photo/2015/04/23/22/00/tree-736885__340.jpg',
						// 	xScale: 0.1,
						// 	yScale: 0.1
						// }
					},
					label: BODIES_LABElS.PARTITION,

				}
			);
			partition.plugin = { text: `${texts2[i - 1]}x` };
			World.add( ENGINE.world, partition );
		}
	};

	const handleMouseDown = ( event: IMouseEvent<any> ) => {
		Composite.add( ENGINE.world, [Bodies.circle( event.mouse.position.x, event.mouse.position.y, BALL_RADIUS, {
			restitution: RESTITUTION, friction: FRICTION, frictionAir: FRICTION_AIR, slop: SLOP, isStatic: false, label: BODIES_LABElS.BALL
		} )] );
	};

	const addBall = useCallback( () => {
		const width = WIDTH / 2;
		Composite.add( ENGINE.world, [Bodies.circle( width, Common.random(), BALL_RADIUS, {
			restitution: RESTITUTION, friction: FRICTION, frictionAir: FRICTION_AIR, slop: SLOP, isStatic: false, label: BODIES_LABElS.BALL
		} )] );
	}, [] );

	const createBalls = ( numberBalls: number ) => {
		for ( let i = 0; i < numberBalls; i++ ) {
			addBall();
		}
	};


	const [ball, setBall] = useState( 5 );
	const [, setEndValue] = useState( 5 );


	return (
		<Box className="h-screen flex justify-center items-center flex-col w-full">

			<div className="flex gap-3 max-md:flex-col">
				<div ref={sceneRef} />
				<div className="w-[500px] flex flex-col gap-7">
					<Slider
						className="w-full"
						defaultValue={ball}
						labelAlwaysOn
						min={1}
						max={10}
						step={1}
						onChangeEnd={( val ) => {
							setEndValue( val )
							createBalls( val )
						}}
						value={ball} onChange={setBall}
						marks={[
							{ value: 3, label: '3 Ball' },
							{ value: 5, label: '5 Ball' },
							{ value: 7, label: '7 Ball' },
						]}
					/>
					<Button onClick={() => createBalls( ball )} type="button">CREATE BALL</Button>
					<Checkbox
						disabled
						size="lg"
						checked={checked}
						label="Add Ball At Mouse Position"
						onChange={( event ) => setChecked( event.currentTarget.checked )}
					/>
					<p>
						I have used <a href="https://brm.io/matter-js/" target='_blank' className="text-blue-600" rel="noreferrer">Matter.js</a> to create a simple peg game.
						<br />
						The game consists of pegs and partitions.
						<br />
						The pegs are arranged in a triangular pattern.
						<br />
						The partitions are placed in the middle of the pegs.
						<br />
						When a ball hits a peg, the peg changes its color.
						<br />
						When a ball hits a partition, the partition moves up and down.
						<br />
						The game also has walls on all four sides. The walls are used to keep the balls inside the game area.
						<br />
						The game also has a mouse constraint. The mouse constraint is used to add balls at the mouse position.
						<br />
						The game also has a slider. The slider is used to add balls to the game. The game also has a checkbox.
						<br />
						The checkbox is used to enable or disable the mouse constraint.
					</p>
				</div>
			</div>
		</Box>
	);
};

export default Scene;
