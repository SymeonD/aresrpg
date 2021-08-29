import equals from 'fast-deep-equal'

import inline_component from './inline_component.js'
import normalize from './normalize.js'

const MAGIC_RESET = '§r'
const UPSERT_SCORE_ACTION = 0

function no_duplicates(components) {
  return ({ component, index }) => {
    const { length } = components
      .slice(0, index)
      .map(normalize)
      .filter((current_component) => equals(current_component, component))

    const [first, ...tail] = component

    return {
      component: [
        { ...first, text: `${MAGIC_RESET.repeat(length)}${first.text ?? ''}` },
        ...tail,
      ],
      index,
    }
  }
}

function only_changes(components) {
  return ({ component, index }) =>
    !equals(components.map(normalize)[index], component)
}

function create_packet(scoreName) {
  return ({ component, index }) => ({
    scoreName,
    action: UPSERT_SCORE_ACTION,
    itemName: inline_component(component).slice(0, 40),
    value: index + 1,
  })
}

export default function ({ client, scoreboard_name }) {
  return ({ last, next }) =>
    next
      .map(normalize)
      .map((component, index) => ({ component, index }))
      .filter(only_changes(last))
      .map(no_duplicates(next))
      .map(create_packet(scoreboard_name))
      .forEach((options) => client.write('scoreboard_score', options))
}
