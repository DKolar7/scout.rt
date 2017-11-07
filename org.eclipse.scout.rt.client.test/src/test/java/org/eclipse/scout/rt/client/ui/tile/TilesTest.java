/*******************************************************************************
 * Copyright (c) 2017 BSI Business Systems Integration AG.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *     BSI Business Systems Integration AG - initial API and implementation
 ******************************************************************************/
package org.eclipse.scout.rt.client.ui.tile;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

import org.eclipse.scout.rt.client.testenvironment.TestEnvironmentClientSession;
import org.eclipse.scout.rt.platform.holders.BooleanHolder;
import org.eclipse.scout.rt.testing.client.runner.ClientTestRunner;
import org.eclipse.scout.rt.testing.client.runner.RunWithClientSession;
import org.eclipse.scout.rt.testing.platform.runner.RunWithSubject;
import org.junit.Test;
import org.junit.runner.RunWith;

@RunWith(ClientTestRunner.class)
@RunWithSubject("default")
@RunWithClientSession(TestEnvironmentClientSession.class)
public class TilesTest {

  @Test
  public void testAddTile() {
    P_Tiles tiles = createTestTiles();
    P_Tile tile0 = createTestTile();
    P_Tile tile1 = createTestTile();
    P_Tile tile2 = createTestTile();
    assertTrue(tiles.getTiles().isEmpty());

    tiles.addTile(tile0);
    assertEquals(1, tiles.getTiles().size());
    assertEquals(tile0, tiles.getTiles().get(0));

    tiles.addTiles(Arrays.asList(tile1, tile2));
    assertEquals(3, tiles.getTiles().size());
    assertEquals(tile0, tiles.getTiles().get(0));
    assertEquals(tile1, tiles.getTiles().get(1));
    assertEquals(tile2, tiles.getTiles().get(2));
  }

  @Test
  public void testDeleteTile() {
    P_Tiles tiles = createTestTiles();
    P_Tile tile0 = createTestTile();
    P_Tile tile1 = createTestTile();
    P_Tile tile2 = createTestTile();
    tiles.addTiles(Arrays.asList(tile0, tile1, tile2));
    assertEquals(3, tiles.getTiles().size());

    tiles.deleteTile(tile1);
    assertEquals(2, tiles.getTiles().size());
    assertEquals(tile0, tiles.getTiles().get(0));
    assertEquals(tile2, tiles.getTiles().get(1));

    tiles.deleteTiles(Arrays.asList(tile0, tile2));
    assertEquals(0, tiles.getTiles().size());
  }

  @Test
  public void testDeleteAllTiles() {
    P_Tiles tiles = createTestTiles();
    P_Tile tile0 = createTestTile();
    P_Tile tile1 = createTestTile();
    P_Tile tile2 = createTestTile();
    tiles.addTiles(Arrays.asList(tile0, tile1, tile2));
    assertEquals(3, tiles.getTiles().size());

    tiles.deleteAllTiles();
    assertEquals(0, tiles.getTiles().size());
  }

  @Test
  public void testSelectTiles() {
    P_Tiles tiles = createTestTiles();
    tiles.setSelectable(true);
    tiles.setMultiSelect(false);
    P_Tile tile0 = createTestTile();
    P_Tile tile1 = createTestTile();
    P_Tile tile2 = createTestTile();
    tiles.addTiles(Arrays.asList(tile0, tile1, tile2));

    assertTrue(tiles.getSelectedTiles().isEmpty());
    tiles.selectTile(tile0);
    assertEquals(1, tiles.getSelectedTiles().size());
    assertEquals(tile0, tiles.getSelectedTile());

    tiles.selectTile(tile1);
    assertEquals(1, tiles.getSelectedTiles().size());
    assertEquals(tile1, tiles.getSelectedTile());
  }

  @SuppressWarnings("unchecked")
  @Test
  public void testSelectTilesEvent() {
    P_Tiles tiles = createTestTiles();
    tiles.setSelectable(true);
    tiles.setMultiSelect(false);
    P_Tile tile0 = createTestTile();
    P_Tile tile1 = createTestTile();
    P_Tile tile2 = createTestTile();
    tiles.addTiles(Arrays.asList(tile0, tile1, tile2));

    final List<ITile> newSelection = new ArrayList<ITile>();
    tiles.addPropertyChangeListener(event -> {
      newSelection.addAll((List<ITile>) event.getNewValue());
    });
    tiles.selectTile(tile0);
    assertEquals(1, newSelection.size());
    assertEquals(tile0, newSelection.get(0));
  }

  @Test
  public void testSelectTiles_filtered() {
    P_Tiles tiles = createTestTiles();
    tiles.setSelectable(true);
    P_Tile tile0 = createTestTile();
    P_Tile tile1 = createTestTile();
    P_Tile tile2 = createTestTile();
    tiles.addTiles(Arrays.asList(tile0, tile1, tile2));
    assertEquals(3, tiles.getTiles().size());
    assertEquals(3, tiles.getFilteredTiles().size());
    assertEquals(0, tiles.getSelectedTiles().size());

    // Only tile1 is visible -> only tile1 may be selected
    ITileFilter filter = (tile) -> tile == tile1; // accept tile1
    tiles.addFilter(filter);
    tiles.selectTiles(Arrays.asList(tile0, tile1));
    assertEquals(3, tiles.getTiles().size());
    assertEquals(1, tiles.getFilteredTiles().size());
    assertEquals(1, tiles.getSelectedTiles().size());
    assertEquals(tile1, tiles.getFilteredTiles().get(0));
    assertEquals(tile1, tiles.getSelectedTiles().get(0));

    tiles.removeFilter(filter);
    tiles.selectTiles(Arrays.asList(tile0, tile1));
    assertEquals(3, tiles.getTiles().size());
    assertEquals(3, tiles.getFilteredTiles().size());
    assertEquals(2, tiles.getSelectedTiles().size());
    assertEquals(tile0, tiles.getSelectedTiles().get(0));
    assertEquals(tile1, tiles.getSelectedTiles().get(1));
  }

  @Test
  public void testDeselectTiles() {
    P_Tiles tiles = createTestTiles();
    tiles.setSelectable(true);
    tiles.setMultiSelect(false);
    P_Tile tile0 = createTestTile();
    P_Tile tile1 = createTestTile();
    P_Tile tile2 = createTestTile();
    tiles.addTiles(Arrays.asList(tile0, tile1, tile2));

    assertTrue(tiles.getSelectedTiles().isEmpty());
    tiles.selectTile(tile0);
    assertEquals(1, tiles.getSelectedTiles().size());
    assertEquals(tile0, tiles.getSelectedTile());

    tiles.deselectTile(tile0);
    assertEquals(0, tiles.getSelectedTiles().size());
  }

  @SuppressWarnings("unchecked")
  @Test
  public void testDeselectTilesEvent() {
    P_Tiles tiles = createTestTiles();
    tiles.setSelectable(true);
    tiles.setMultiSelect(false);
    P_Tile tile0 = createTestTile();
    P_Tile tile1 = createTestTile();
    P_Tile tile2 = createTestTile();
    tiles.addTiles(Arrays.asList(tile0, tile1, tile2));
    tiles.selectTile(tile0);
    assertEquals(1, tiles.getSelectedTiles().size());
    assertEquals(tile0, tiles.getSelectedTile());

    final List<ITile> newSelection = new ArrayList<ITile>();
    BooleanHolder eventFired = new BooleanHolder(false);
    tiles.addPropertyChangeListener(event -> {
      newSelection.addAll((List<ITile>) event.getNewValue());
      eventFired.setValue(true);
    });
    tiles.deselectTile(tile0);
    assertEquals(0, newSelection.size());
    assertTrue(eventFired.getValue());
  }

  @Test
  public void testDeselectTilesWhenDeleted() {
    P_Tiles tiles = createTestTiles();
    tiles.setSelectable(true);
    tiles.setMultiSelect(true);
    P_Tile tile0 = createTestTile();
    P_Tile tile1 = createTestTile();
    P_Tile tile2 = createTestTile();
    tiles.addTiles(Arrays.asList(tile0, tile1, tile2));

    assertTrue(tiles.getSelectedTiles().isEmpty());
    tiles.selectTiles(Arrays.asList(tile0, tile1));
    assertEquals(2, tiles.getSelectedTiles().size());
    assertEquals(tile0, tiles.getSelectedTile());
    assertEquals(tile0, tiles.getSelectedTiles().get(0));
    assertEquals(tile1, tiles.getSelectedTiles().get(1));

    tiles.deleteTile(tile0);
    assertEquals(1, tiles.getSelectedTiles().size());
    assertEquals(tile1, tiles.getSelectedTiles().get(0));
  }

  @Test
  public void testSelectAllTiles() {
    P_Tiles tiles = createTestTiles();
    tiles.setSelectable(true);
    tiles.setMultiSelect(true);
    P_Tile tile0 = createTestTile();
    P_Tile tile1 = createTestTile();
    P_Tile tile2 = createTestTile();
    tiles.addTiles(Arrays.asList(tile0, tile1, tile2));

    assertTrue(tiles.getSelectedTiles().isEmpty());
    tiles.selectAllTiles();
    assertEquals(3, tiles.getSelectedTiles().size());
    assertEquals(tile0, tiles.getSelectedTiles().get(0));
    assertEquals(tile1, tiles.getSelectedTiles().get(1));
    assertEquals(tile2, tiles.getSelectedTiles().get(2));
  }

  @Test
  public void testDeselectAllTiles() {
    P_Tiles tiles = createTestTiles();
    tiles.setSelectable(true);
    tiles.setMultiSelect(true);
    P_Tile tile0 = createTestTile();
    P_Tile tile1 = createTestTile();
    P_Tile tile2 = createTestTile();
    tiles.addTiles(Arrays.asList(tile0, tile1, tile2));

    assertTrue(tiles.getSelectedTiles().isEmpty());
    tiles.selectAllTiles();
    assertEquals(3, tiles.getSelectedTiles().size());

    tiles.deselectAllTiles();
    assertEquals(0, tiles.getSelectedTiles().size());
  }

  @Test
  public void testDeselectAllTilesWhenAllDeleted() {
    P_Tiles tiles = createTestTiles();
    tiles.setSelectable(true);
    tiles.setMultiSelect(true);
    P_Tile tile0 = createTestTile();
    P_Tile tile1 = createTestTile();
    P_Tile tile2 = createTestTile();
    tiles.addTiles(Arrays.asList(tile0, tile1, tile2));

    assertTrue(tiles.getSelectedTiles().isEmpty());
    tiles.selectAllTiles();
    assertEquals(3, tiles.getSelectedTiles().size());

    tiles.deleteAllTiles();
    assertEquals(0, tiles.getTiles().size());
    assertEquals(0, tiles.getSelectedTiles().size());
  }

  @Test
  public void testFilterTiles() {
    P_Tiles tiles = createTestTiles();
    P_Tile tile0 = createTestTile();
    P_Tile tile1 = createTestTile();
    P_Tile tile2 = createTestTile();
    tiles.addTiles(Arrays.asList(tile0, tile1, tile2));
    assertEquals(3, tiles.getTiles().size());
    assertEquals(3, tiles.getFilteredTiles().size());

    ITileFilter filter1 = (tile) -> tile != tile1; // accept tile0 and tile2
    tiles.addFilter(filter1);
    assertEquals(3, tiles.getTiles().size());
    assertEquals(2, tiles.getFilteredTiles().size());
    assertEquals(tile0, tiles.getFilteredTiles().get(0));
    assertEquals(tile2, tiles.getFilteredTiles().get(1));
    assertEquals(true, tiles.getTiles().get(0).isFilterAccepted());
    assertEquals(false, tiles.getTiles().get(1).isFilterAccepted());
    assertEquals(true, tiles.getTiles().get(2).isFilterAccepted());

    ITileFilter filter2 = (tile) -> tile != tile0; // accept tile1 and tile2
    tiles.addFilter(filter2);
    assertEquals(3, tiles.getTiles().size());
    assertEquals(1, tiles.getFilteredTiles().size());
    assertEquals(tile2, tiles.getFilteredTiles().get(0));
    assertEquals(false, tiles.getTiles().get(0).isFilterAccepted());
    assertEquals(false, tiles.getTiles().get(1).isFilterAccepted());
    assertEquals(true, tiles.getTiles().get(2).isFilterAccepted());

    tiles.removeFilter(filter1);
    assertEquals(3, tiles.getTiles().size());
    assertEquals(2, tiles.getFilteredTiles().size());
    assertEquals(tile1, tiles.getFilteredTiles().get(0));
    assertEquals(tile2, tiles.getFilteredTiles().get(1));
    assertEquals(false, tiles.getTiles().get(0).isFilterAccepted());
    assertEquals(true, tiles.getTiles().get(1).isFilterAccepted());
    assertEquals(true, tiles.getTiles().get(2).isFilterAccepted());

    tiles.removeFilter(filter2);
    assertEquals(3, tiles.getTiles().size());
    assertEquals(3, tiles.getFilteredTiles().size());
    assertEquals(tile0, tiles.getFilteredTiles().get(0));
    assertEquals(tile1, tiles.getFilteredTiles().get(1));
    assertEquals(tile2, tiles.getFilteredTiles().get(2));
    assertEquals(true, tiles.getTiles().get(0).isFilterAccepted());
    assertEquals(true, tiles.getTiles().get(1).isFilterAccepted());
    assertEquals(true, tiles.getTiles().get(2).isFilterAccepted());
  }

  @Test
  public void testFilterTiles_deselectTiles() {
    P_Tiles tiles = createTestTiles();
    tiles.setSelectable(true);
    P_Tile tile0 = createTestTile();
    P_Tile tile1 = createTestTile();
    P_Tile tile2 = createTestTile();
    tiles.addTiles(Arrays.asList(tile0, tile1, tile2));
    tiles.selectTiles(Arrays.asList(tile0, tile1));
    assertEquals(3, tiles.getTiles().size());
    assertEquals(3, tiles.getFilteredTiles().size());
    assertEquals(2, tiles.getSelectedTiles().size());
    assertEquals(tile0, tiles.getSelectedTiles().get(0));
    assertEquals(tile1, tiles.getSelectedTiles().get(1));

    ITileFilter filter = (tile) -> tile == tile1; // accept tile1
    tiles.addFilter(filter);
    assertEquals(3, tiles.getTiles().size());
    assertEquals(1, tiles.getFilteredTiles().size());
    assertEquals(1, tiles.getSelectedTiles().size());
    assertEquals(tile1, tiles.getSelectedTiles().get(0));
  }

  @Test
  public void testFilterTiles_insertTiles() {
    P_Tiles tiles = createTestTiles();
    P_Tile tile0 = createTestTile();
    P_Tile tile1 = createTestTile();
    P_Tile tile2 = createTestTile();
    P_Tile tile3 = createTestTile();
    P_Tile tile4 = createTestTile();
    tiles.addTiles(Arrays.asList(tile0, tile1, tile2));
    assertEquals(3, tiles.getTiles().size());
    assertEquals(3, tiles.getFilteredTiles().size());

    ITileFilter filter = (tile) -> tile == tile1 || tile == tile4; // accept tile1 and 4
    tiles.addFilter(filter);
    assertEquals(3, tiles.getTiles().size());
    assertEquals(1, tiles.getFilteredTiles().size());
    assertEquals(tile1, tiles.getFilteredTiles().get(0));

    // Insert tile 3 -> not accepted
    tiles.addTile(tile3);
    assertEquals(4, tiles.getTiles().size());
    assertEquals(1, tiles.getFilteredTiles().size());
    assertEquals(tile1, tiles.getFilteredTiles().get(0));

    // Insert tile 4 -> accepted
    tiles.addTile(tile4);
    assertEquals(5, tiles.getTiles().size());
    assertEquals(2, tiles.getFilteredTiles().size());
    assertEquals(tile1, tiles.getFilteredTiles().get(0));
    assertEquals(tile4, tiles.getFilteredTiles().get(1));
  }

  /**
   * Creates an empty tiles element.
   */
  private P_Tiles createTestTiles() {
    P_Tiles tiles = new P_Tiles();
    tiles.initTiles();
    return tiles;
  }

  private P_Tile createTestTile() {
    return new P_Tile();
  }

  public static class P_Tiles extends AbstractTiles {
  }

  public static class P_Tile extends AbstractTile {
  }
}
